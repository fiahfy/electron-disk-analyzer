import path from 'path'
import { Module, VuexModule, Mutation, Action } from 'vuex-module-decorators'
import { settingsStore } from '~/store'
const Worker = require('~/workers/scanner.worker.ts')

const worker = new Worker()

// const reversed: { [key: string]: boolean } = {
//   name: false,
//   value: true,
// }

type Status =
  | 'ready'
  | 'running'
  | 'succeeded'
  | 'cancelling'
  | 'cancelled'
  | 'failed'

@Module({
  name: 'scanner',
  stateFactory: true,
  namespaced: true,
})
export default class ScannerModule extends VuexModule {
  status: Status = 'ready'
  message = ''
  location = ''
  rootPath = ''
  progressPath = ''
  startTime = 0
  endTime = 0
  data: any = {}
  // order = {
  //   by: 'value',
  //   descending: false,
  // }

  get totalTime() {
    if (!this.startTime || !this.endTime) {
      return 0
    }
    return this.endTime - this.startTime
  }

  get totalSize() {
    return this.data.value || 0
  }

  get rootPathHasNoTrailingSlash() {
    // Remove trailing seperator
    const rootPath = this.rootPath
    if (rootPath && rootPath.slice(-1) === path.sep) {
      return rootPath.slice(0, rootPath.length - 1)
    }
    return rootPath
  }

  get items() {
    // const { by, descending } = this.order
    return []
    // return [
    //   { system: true, name: '<root>' },
    //   { system: true, name: '<parent>' },
    //   ...this.selectedNames
    //     .reduce((carry, name) => {
    //       if (!carry) {
    //         return carry
    //       }
    //       return carry.children.find((c: any) => c.name === name)
    //     }, this.data)
    //     .children.concat()
    //     .sort((a: any, b: any) => {
    //       let result = 0
    //       if (a[by] > b[by]) {
    //         result = 1
    //       } else if (a[by] < b[by]) {
    //         result = -1
    //       }
    //       if (result === 0) {
    //         if (a.path > b.path) {
    //           result = 1
    //         } else if (a.path < b.path) {
    //           result = -1
    //         }
    //       }
    //       result = reversed[by] ? -1 * result : result
    //       return descending ? -1 * result : result
    //     }),
    // ]
  }

  get getScanTime() {
    return () => {
      return this.status === 'running' ? this.getElapsedTime() : this.totalTime
    }
  }

  get getElapsedTime() {
    return () => {
      return this.startTime ? new Date().getTime() - this.startTime : 0
    }
  }

  @Action
  initialize() {
    if (['running', 'cancelling'].includes(this.status)) {
      this.setStatus({ status: 'ready' })
    }
  }

  @Action
  run() {
    if (['running', 'cancelling'].includes(this.status)) {
      return
    }

    this.setStatus({ status: 'running' })
    this.setMessage({ message: '' })
    this.setStartTime({ startTime: Date.now() })
    this.setRootPath({ rootPath: this.location })

    worker.onmessage = ({
      data: { id, data },
    }: {
      data: { id: string; data: any }
    }) => {
      switch (id) {
        case 'progress':
          this.setProgressPath({ progressPath: data })
          break
        case 'refresh': {
          this.setData({ data })
          break
        }
        case 'done': {
          this.setEndTime({ endTime: Date.now() })
          const status =
            this.status === 'cancelling' ? 'cancelled' : 'succeeded'
          const title =
            this.status === 'cancelling' ? 'Scan cancelled' : 'Scan finished'

          this.setStatus({ status })
          this.setData({ data })

          const totalTime = (this.getScanTime() / 1000).toFixed(2)
          // eslint-disable-next-line
          const _ = new Notification(title, {
            body: `Total time: ${totalTime} sec`,
          })
          break
        }
        case 'failed':
          this.setEndTime({ endTime: Date.now() })
          this.setStatus({ status: 'failed' })
          this.setMessage({ message: data })
          break
      }
    }
    const data = {
      dirPath: this.rootPath,
      refreshInterval: settingsStore.refreshInterval,
      ignoredPaths: settingsStore.ignoredPaths,
    }
    worker.postMessage({ id: 'start', data })
  }

  @Action
  cancel() {
    this.setStatus({ status: 'cancelling' })
    worker.postMessage({ id: 'cancel' })
  }

  // @Action
  // changeOrderBy({ orderBy }: { orderBy: any }) {
  //   const descending =
  //     state.order.by === orderBy ? !state.order.descending : false
  //   const order = { by: orderBy, descending }
  //   commit('setOrder', { order })
  // }

  @Mutation
  setStatus({ status }: { status: Status }) {
    this.status = status
  }

  @Mutation
  setMessage({ message }: { message: string }) {
    this.message = message
  }

  @Mutation
  setLocation({ location }: { location: string }) {
    this.location = location
  }

  @Mutation
  setRootPath({ rootPath }: { rootPath: string }) {
    this.rootPath = rootPath
  }

  @Mutation
  setProgressPath({ progressPath }: { progressPath: string }) {
    this.progressPath = progressPath
  }

  @Mutation
  setStartTime({ startTime }: { startTime: number }) {
    this.startTime = startTime
  }

  @Mutation
  setEndTime({ endTime }: { endTime: number }) {
    this.endTime = endTime
  }

  @Mutation
  setData({ data }: { data: Object }) {
    this.data = data
  }
}
