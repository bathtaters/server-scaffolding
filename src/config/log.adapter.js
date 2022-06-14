const mkDir = require('fs').mkdirSync
const logDir = require('./meta').logDir
const { getLogLevel, getFunction, logNames } = require('../utils/log.utils')
const { appendToLog } = require('../services/log.services')

const defaultMax = { console: 'info', file: 'warn' }

const initMessage = (order) => ([name, level]) =>
  `${name.charAt(0).toUpperCase()}${name.slice(1)} log set to ${order[level] || 'level ' + level} (${level} of ${order.length - 1})`

const getFunctions = {
  console: (name) => name in console ? console[name]     : () => {},
  file:    (name) => name !== 'none' ? appendToLog(name) : () => {},
}

function createLogObject(logDir) {
  // Recursively create logDir folders (if they don't exist)
  const createdDir = Boolean(mkDir(logDir, { recursive: true }))
  
  // Define log levels
  const logOrder = [ 'none', 'error', 'warn', 'log', 'info', 'debug' ].map((name) => name.toLowerCase())

  // Get logLevel settings
  const maxLevels = {
    console: getLogLevel(logOrder, process.env.LOG_CONSOLE, getLogLevel(defaultMax.console)),
    file: getLogLevel(logOrder, process.env.LOG_FILE, getLogLevel(defaultMax.file)),
  }
  
  // Build logger object
  let logger = { logLevel: logNames(maxLevels, (level) => logOrder[level] || level) }
  logOrder.forEach((name, level) => { logger[name] = getFunction(level, maxLevels, name, getFunctions) }, {})
  
  // Now that logger is setup, write out pending messages
  if (createdDir) logger.info('Created folder for logs:', logDir)
  if (process.env.NODE_ENV !== 'test') logger.info(Object.entries(maxLevels).map(initMessage(logOrder)).join(', '))

  return logger
}

module.exports = createLogObject(logDir)