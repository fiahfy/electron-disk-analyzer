import fs from 'fs'
import path from 'path'

const interval = 100

let scanning = false
let cancelling = true
let lastProgressTime = 0
let callbacks = {}

const scanFile = (filepath, node) => {
  if (cancelling) {
    return
  }

  const now = (new Date()).getTime()
  if (now - lastProgressTime > interval) {
    lastProgressTime = now
    send('progress', filepath)
  }

  try {
    const stats = fs.lstatSync(filepath)
    if (stats.isDirectory()) {
      node.name = path.basename(filepath)
      node.children = []
      fs.readdirSync(filepath).forEach((filename) => {
        const childNode = {}
        node.children.push(childNode)
        scanFile(path.join(filepath, filename), childNode)
      })
    } else {
      node.name = path.basename(filepath)
      node.size = stats.size
    }
  } catch (e) {
    console.error(e)
  }
}

const send = (event, args) => {
  const callback = callbacks[event]
  if (callback) {
    callback(args)
  }
}

export let node = {}

export const scan = (filepath) => {
  if (scanning) {
    return
  }
  scanning = true
  cancelling = false

  node = {}
  lastProgressTime = 0
  setTimeout(() => {
    scanFile(filepath, node)
    send('complete')
    scanning = false
  })
}

export const cancel = () => {
  console.log('cancelling')
  cancelling = true
}

export const on = (event, callback) => {
  callbacks[event] = callback
}
