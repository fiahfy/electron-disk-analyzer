import { remote, shell, clipboard } from 'electron'
import * as Storage from '~/utils/storage'
import Worker from '~/workers/scanner.worker.js'

export const Status = {
  notYet: 'NOT_YET',
  progress: 'PROGRESS',
  done: 'DONE',
  cancelling: 'CANCELLING',
  cancelled: 'CANCELLED',
  error: 'ERROR'
}

const worker = Worker()

export const state = () => ({
  status: Status.notYet,
  error: null,
  directory: null,
  directoryInput: remote.app.getPath('home'),
  progressFilepath: null,
  begunAt: null,
  endedAt: null,
  updatedAt: null
})

export const getters = {
  getNode: (state) => () => {
    if (state.status === Status.notYet) {
      return
    }
    return Storage.read(Storage.getFilepath())
  },
  getScanTime: (state, getters) => () => {
    if (state.status === Status.progress) {
      return getters.getElapsedTime()
    }
    return getters.totalTime
  },
  getElapsedTime: (state) => () => {
    if (!state.begunAt) {
      return null
    }
    return new Date().getTime() - state.begunAt
  },
  totalTime(state) {
    if (!state.begunAt || !state.endedAt) {
      return null
    }
    return state.endedAt - state.begunAt
  }
}

export const actions = {
  initialize({ commit, state }) {
    if (state.status === Status.progress) {
      commit('setStatus', { status: Status.cancelled })
    }
  },
  openDirectory({ commit }) {
    const filepathes = remote.dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (!filepathes || !filepathes.length) {
      return
    }
    const filepath = filepathes[0]
    commit('setDirectoryInput', { directoryInput: filepath })
  },
  scan({ commit, dispatch, getters, rootState, state }) {
    if (!state.directoryInput) {
      dispatch(
        'showMessage',
        { color: 'error', text: 'Directory is not specified' },
        { root: true }
      )
      return
    }

    commit('setStatus', { status: Status.progress })
    commit('setDirectory', { directory: state.directoryInput })
    commit('begin')

    worker.onmessage = ({ data: { id, data } }) => {
      switch (id) {
        case 'progress':
          commit('setProgressFilepath', { progressFilepath: data })
          break
        case 'refresh':
          commit('update')
          break
        case 'complete': {
          commit('update')
          commit('end')
          if (state.status === Status.cancelling) {
            commit('setStatus', { status: Status.cancelled })
            return
          }
          commit('setStatus', { status: Status.done })
          const sec = (getters.getScanTime() / 1000).toFixed(2)
          dispatch(
            'showNotification',
            { title: 'Scan finished', body: `Total time: ${sec} sec` },
            { root: true }
          )
          break
        }
        case 'error':
          commit('update')
          commit('end')
          commit('setStatus', { status: Status.error })
          commit('setError', { error: new Error(data) })
          dispatch('showNotification', { title: 'Scan failed' }, { root: true })
          break
      }
    }
    const data = {
      directory: state.directory,
      refreshInterval: rootState.settings.refreshInterval,
      dataFilepath: Storage.getFilepath()
    }
    worker.postMessage({ id: 'scan', data })
  },
  cancel({ commit }) {
    commit('setStatus', { status: Status.cancelling })
    worker.postMessage({ id: 'cancel' })
  },
  browseDirectory({ dispatch }, { filepath }) {
    const result = shell.openItem(filepath)
    if (!result) {
      dispatch(
        'showMessage',
        { color: 'error', text: 'Invalid directory' },
        { root: true }
      )
    }
  },
  writeToClipboard(_, { filepath }) {
    clipboard.writeText(filepath)
  }
}

export const mutations = {
  setStatus(state, { status }) {
    state.status = status
  },
  setError(state, { error }) {
    state.error = error
  },
  setDirectory(state, { directory }) {
    state.directory = directory
  },
  setDirectoryInput(state, { directoryInput }) {
    state.directoryInput = directoryInput
  },
  setProgressFilepath(state, { progressFilepath }) {
    state.progressFilepath = progressFilepath
  },
  begin(state) {
    state.begunAt = new Date().getTime()
  },
  end(state) {
    state.endedAt = new Date().getTime()
  },
  update(state) {
    state.updatedAt = new Date().getTime()
  }
}
