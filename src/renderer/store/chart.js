import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { shell } from 'electron'
import Worker from '../workers/scanner.worker.js'

export const Status = {
  notYet: 'NOT_YET',
  progress: 'PROGRESS',
  done: 'DONE',
  canceled: 'CANCELED'
}

let worker

export default {
  namespaced: true,
  state: {
    status: Status.notYet,
    scanedFilepath: null,
    progressFilepath: null,
    begunAt: null,
    endedAt: null,
    updatedAt: null
  },
  actions: {
    scan ({ commit, dispatch }, { dirpath }) {
      commit('setStatus', { status: Status.progress })
      commit('setScanedFilepath', { scanedFilepath: dirpath })
      commit('begin')

      if (worker) {
        worker.terminate()
      }
      worker = new Worker()
      worker.onmessage = ({ data: { id, data } }) => {
        switch (id) {
          case 'progress':
            commit('setProgressFilepath', { progressFilepath: data })
            break
          case 'refresh':
            commit('update')
            break
          case 'complete':
            commit('update')
            commit('end')
            commit('setStatus', { status: Status.done })
            break
        }
      }
      worker.postMessage({ id: 'requestScan', data: dirpath })
    },
    cancel ({ commit }) {
      commit('end')
      commit('setStatus', { status: Status.canceled })
      if (worker) {
        worker.terminate()
      }
    },
    open (_, { filepath }) {
      shell.openItem(filepath)
    }
  },
  mutations: {
    setStatus (state, { status }) {
      state.status = status
    },
    setScanedFilepath (state, { scanedFilepath }) {
      state.scanedFilepath = scanedFilepath
    },
    setProgressFilepath (state, { progressFilepath }) {
      state.progressFilepath = progressFilepath
    },
    begin (state) {
      state.begunAt = (new Date()).getTime()
    },
    end (state) {
      state.endedAt = (new Date()).getTime()
    },
    update (state) {
      state.updatedAt = (new Date()).getTime()
    }
  },
  getters: {
    scanedPathes (state) {
      if (!state.scanedFilepath) {
        return []
      }
      const pathes = state.scanedFilepath.split(path.sep)
      if (pathes.length && pathes[pathes.length - 1] === '') {
        pathes.pop()
      }
      return pathes
    },
    getNode: () => () => {
      try {
        console.time('read file')
        const buffer = fs.readFileSync(path.join(process.cwd(), 'data.json.gz'))
        console.timeEnd('read file')
        console.time('decompress')
        const json = zlib.gunzipSync(buffer)
        console.timeEnd('decompress')
        console.time('parse')
        const data = JSON.parse(json)
        console.timeEnd('parse')
        return data
      } catch (e) {
        return null
      }
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
      return (new Date()).getTime() - state.begunAt
    },
    totalTime (state) {
      if (!state.begunAt || !state.endedAt) {
        return null
      }
      return state.endedAt - state.begunAt
    }
  }
}
