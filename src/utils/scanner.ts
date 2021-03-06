import fs from 'fs'
import path from 'path'
import { clone } from '@fiahfy/simple-clone'

const progressInterval = 100

type Node = {
  name: string
  value: number
  children: Node[]
}

let scanning = false
let cancelling = false
let progressTime = 0
let node = { name: '', value: 0, children: [] }
let ignoredPaths: string[] = []
const callbacks: { [event: string]: (filePath?: string) => void } = {}

const delay = (millis = 0) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, millis)
  })
}

const call = (event: string, filePath?: string) => {
  const callback = callbacks[event]
  if (callback) {
    callback(filePath)
  }
}

const scanPath = async (filePath: string, depth: number, node: Node) => {
  if (ignoredPaths.includes(filePath)) {
    return
  }
  if (cancelling) {
    return
  }

  const now = new Date().getTime()
  if (now > progressTime) {
    progressTime = now + progressInterval
    call('progress', filePath)
    await delay() // wait for receiving cancel request
  }

  try {
    const stats = fs.lstatSync(filePath)
    if (stats.isDirectory()) {
      node.name = path.basename(filePath)
      node.value = 0
      node.children = []
      const filenames = fs.readdirSync(filePath)
      for (const filename of filenames) {
        const childNode = { name: '', value: 0, children: [] }
        node.children = [...node.children, childNode]
        await scanPath(path.join(filePath, filename), depth + 1, childNode)
        node.value += childNode.value
      }
      if (depth > 10) {
        delete node.children
      }
    } else {
      node.name = path.basename(filePath)
      node.value = stats.size
    }
  } catch (e) {
    //
  }
}

const sum = (node: Node) => {
  if (!node.children || !node.children.length) {
    return
  }
  node.children.forEach((child) => sum(child))
  node.value = node.children.reduce(
    (carry, child) => carry + (child.value || 0),
    0
  )
}

const reduce = (node: Node, limit: number, root: boolean) => {
  if (!node.children) {
    return
  }
  node.children = node.children.filter((child) => root || child.value > limit)
  node.children.forEach((child) => reduce(child, limit, false))
}

const scan = async (filePath: string): Promise<void> => {
  if (scanning || cancelling) {
    return
  }
  scanning = true
  cancelling = false
  progressTime = Date.now() + progressInterval
  node = { name: '', value: 0, children: [] }

  await scanPath(filePath, 0, node)

  call('done')

  cancelling = false
  scanning = false
}

const cancel = (): void => {
  cancelling = true
}

const on = (event: string, callback: (filePath?: string) => void): void => {
  callbacks[event] = callback
}

const setConfig = (config: { ignoredPaths: string[] }): void => {
  ignoredPaths = config.ignoredPaths
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCalculatedNode = (): any => {
  const root = clone(node)
  sum(root)
  const limit = root.value * 0.001
  reduce(root, limit, true)
  return root
}

export const scanner = { scan, cancel, on, setConfig, getCalculatedNode }
