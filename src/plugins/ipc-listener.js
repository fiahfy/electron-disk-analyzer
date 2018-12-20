import { ipcRenderer } from 'electron'

export default ({ store }) => {
  ipcRenderer.on('openDirectory', () => {
    store.dispatch('local/openDirectory')
  })
  ipcRenderer.on('enterFullScreen', () => {
    store.commit('setFullScreen', { fullScreen: true })
  })
  ipcRenderer.on('leaveFullScreen', () => {
    store.commit('setFullScreen', { fullScreen: false })
  })
  ipcRenderer.on('showSettings', () => {
    store.commit('showDialog')
  })
}
