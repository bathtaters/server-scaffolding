const { createWriteStream } = require('fs')
const { join } = require('path')
const { logDir } = require('../config/meta')
const { formatFileArgs } = require('../utils/log.utils')

let fileStreams = {}

exports.openFile = (name) => {
  if (!fileStreams[name]) fileStreams[name] = createWriteStream(join(logDir, `${name}.log`), { flags: 'a' })
  return fileStreams[name]
}

exports.closeAll = () => Promise.allSettled(
  Object.entries(fileStreams).map(
    ([name, stream]) => new Promise(
      (res,rej) => stream.close((err) => err ? rej(err) : res())
    ).then(() => {
      delete fileStreams[name]
    })
  )
)

exports.appendToLog = (name) => {
  exports.openFile(name)

  return function appendFile(...args) {
    if (!fileStreams[name]) console.debug('Log file closed:',name,'Attempting to write:',...args)
    return fileStreams[name].write(`${new Date().toISOString()}: ${args.map(formatFileArgs).join(' ')}\n`)
  }
}