import fs from 'fs'
import zlib from 'zlib'
import * as scanner from '../utils/scanner'

const refreshInterval = 5000

const output = (data) => {
  console.time('stringify')
  const json = JSON.stringify(data)
  console.timeEnd('stringify')
  console.time('compress')
  const buffer = zlib.gzipSync(json)
  console.timeEnd('compress')
  console.time('write')
  fs.writeFileSync(values.dataFilepath, buffer)
  console.timeEnd('write')
}

const clear = () => {
  try {
    fs.accessSync(values.dataFilepath)
  } catch (e) {
    if (e.code === 'ENOENT') {
      return
    }
    throw e
  }
  console.time('unlink')
  fs.unlinkSync(values.dataFilepath)
  console.timeEnd('unlink')
}

let values = {}

onmessage = ({ data: { id, data } }) => {
  switch (id) {
    case 'defineValues':
      values = data
      break
    case 'scanDirectory':
      clear()
      postMessage({ id: 'refresh' })

      console.log('Begin scan directory: %s', data)
      console.time('scan')
      let time = (new Date()).getTime()
      scanner.on('progress', (filepath) => {
        postMessage({ id: 'progress', data: filepath })
        const now = (new Date()).getTime()
        if (now - time > refreshInterval) {
          console.log('refresh')
          output(scanner.node)
          postMessage({ id: 'refresh' })
          time = (new Date()).getTime()
        }
      })
      scanner.on('complete', () => {
        console.log('complete')
        output(scanner.node)
        postMessage({ id: 'complete' })
        console.timeEnd('scan')
      })
      scanner.scan(data)
      break
  }
}
