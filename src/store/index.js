import Vue from 'vue'
import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'
import Package from '~~/package.json'
import router from '~/router'
import chart from './chart'
import settings from './settings'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    title: Package.productName,
    message: null,
    fullScreen: false
  },
  getters: {
    titleBar (state) {
      return process.platform === 'darwin' && !state.fullScreen
    }
  },
  actions: {
    changeRoute (_, payload) {
      router.push(payload)
    },
    changeTitle ({ commit }, { title = Package.productName }) {
      document.title = title
      commit('setTitle', { title })
    },
    showMessage ({ commit }, message) {
      commit('setMessage', { message })
    },
    showNotification (_, { title, body }) {
      new Notification(title, { body }) // eslint-disable-line no-new
    }
  },
  mutations: {
    setTitle (state, { title }) {
      state.title = title
    },
    setMessage (state, { message }) {
      state.message = message
    },
    setFullScreen (state, { fullScreen }) {
      state.fullScreen = fullScreen
    }
  },
  modules: {
    chart,
    settings
  },
  plugins: [
    createPersistedState({
      paths: [
        'chart',
        'settings'
      ]
    })
  ]
})
