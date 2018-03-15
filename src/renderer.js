import Vue from 'vue'
import { sync } from 'vuex-router-sync'
import App from './renderer/App'
import router from './renderer/router'
import store from './renderer/store'
import './renderer/plugins'
import { addRendererListeners } from './renderer/ipc'

Vue.config.devtools = process.env.NODE_ENV !== 'production'
Vue.config.productionTip = false

sync(store, router)
addRendererListeners(store)

new Vue({ // eslint-disable-line no-new
  el: '#app',
  router,
  store,
  components: { App },
  template: '<App />'
})