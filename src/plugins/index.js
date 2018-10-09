import Vue from 'vue'
import Vuetify from 'vuetify'
import electronAcceleratorFormatter from '@fiahfy/electron-accelerator-formatter'

Vue.use(Vuetify, {
  theme: {
    primary: '#ff4081',
    accent: '#ff4081'
  }
})

Vue.filter('accelerator', (title, accelerator) => {
  return `${title} (${electronAcceleratorFormatter(accelerator)})`
})

Vue.filter('readableSize', (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) {
    return '0 Byte'
  }
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
})
