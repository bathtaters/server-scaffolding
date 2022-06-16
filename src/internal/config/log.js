const mkDir = require('fs').mkdirSync
const { getLogLevel, getFunction, logNames } = require('../utils/log.utils')
const { appendToLog } = require('../services/log.services')
const { defaultLevels, logOrder, initMessage, mkDirMsg } = require('./log.cfg')
const logDir = require('../../config/meta').logDir

function createLogObject() {
  const createdDir = Boolean(mkDir(logDir, { recursive: true }))

  const maxLevels = {
    console: getLogLevel(logOrder, process.env.LOG_CONSOLE, getLogLevel(defaultLevels.console)),
    file:    getLogLevel(logOrder, process.env.LOG_FILE,    getLogLevel(defaultLevels.file)),
  }
  
  let logger = { logLevel: logNames(maxLevels, (level) => logOrder[level] || level) }
  logOrder.forEach((name, level) => { logger[name] = getFunction(level, maxLevels, name, getFunctions) }, {})
  
  if (createdDir) logger.info(mkDirMsg(logDir))
  if (process.env.NODE_ENV !== 'test') logger.info(Object.entries(maxLevels).map(initMessage(logOrder)).join(', '))

  return logger
}

const getFunctions = {
  console: (name) => name in console ? console[name]     : () => {},
  file:    (name) => name !== 'none' ? appendToLog(name) : () => {},
}

module.exports = createLogObject()