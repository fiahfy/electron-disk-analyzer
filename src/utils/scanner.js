import fs from 'fs'
import path from 'path'

const interval = 100

let scanning = false
let lastProgressTime = 0
let callbacks = {}
let node = {}

const scanFile = (filepath, node) => {
  const now = (new Date()).getTime()
  if (now - lastProgressTime > interval) {
    lastProgressTime = now
    send('progress', filepath)
  }

  try {
    const stats = fs.lstatSync(filepath)
    if (stats.isDirectory()) {
      node.name = path.basename(filepath)
      node.value = 0
      node.children = []
      fs.readdirSync(filepath).forEach((filename) => {
        const childNode = {}
        node.children = [...node.children, childNode]
        scanFile(path.join(filepath, filename), childNode)
        node.value += childNode.value
      })
    } else {
      node.name = path.basename(filepath)
      node.value = stats.size
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

const sum = (node) => {
  if (!node.children) {
    return
  }
  node.children.forEach((child) => sum(child))
  node.value = node.children.reduce((carry, child) => carry + (child.value || 0), 0)
}

const reduce = (depth, limit, node) => {
  if (!node.children) {
    return
  }
  if (depth > 11) {
    delete node.children
    return
  }
  node.children = node.children.filter((child) => child.value > limit)
  node.children.forEach((child) => reduce(depth + 1, limit, child))
}

export const scan = (filepath) => {
  if (scanning) {
    return
  }
  scanning = true

  node = {}
  lastProgressTime = 0
  scanFile(filepath, node)

  send('complete')
  scanning = false
}

export const on = (event, callback) => {
  callbacks[event] = callback
}

export const getNode = () => {
  const root = JSON.parse(JSON.stringify(node))
  sum(root)
  const limit = root.value * 0.001
  reduce(0, limit, root)
  return root
}
