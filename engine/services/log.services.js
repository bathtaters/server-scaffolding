const { readdir, readFile } = require('fs/promises')
const { join, dirname, basename } = require('path')
const { formatFileLog, getMaxEntry } = require('../utils/log.utils')
const { logViewFileFilter } = require('../config/log.cfg')
const { logPath } = require('../config/meta')
const [ logDir, logFilename ] = [ dirname(logPath), basename(logPath) ]

// Get log files
const logFileRegex = logViewFileFilter(logFilename)
exports.logList = (folder = logDir) =>
  readdir(folder).then((files) =>
    files.filter((filename) => logFileRegex.test(filename)).sort((a,b) => b.localeCompare(a))
  )

exports.logFile = (filename, folder = logDir) => Promise.all([
  readFile(join(folder, filename)).then((log) =>
    log.toString().split('\n').map(formatFileLog)
  ),
  exports.logList(folder)
]).then(([log, files]) => {
  const idx = files.indexOf(filename)
  if (idx < 0) return { log }
  return { log, prev: files[idx + 1], next: files[idx - 1] }
})

// Normalize log level
exports.getLogLevel = (logLevel, { levels, testLevel, silent, httpDebug }, defaultLevel, isConsole) => {
  if (process.env.NODE_ENV === 'test' && testLevel) return isConsole ? { level: testLevel } : { silent: true }

  if (!logLevel && defaultLevel) logLevel = defaultLevel

  if (typeof logLevel === 'string') logLevel = logLevel.toLowerCase()

  if (logLevel in levels) return { level: logLevel }
  if (silent.includes(logLevel)) return { silent: true }
  if (httpDebug.includes(logLevel)) return { level: getMaxEntry(levels)[0] || 'verbose' }

  if (!defaultLevel) throw new Error(`Invalid default log level: ${logLevel}`)
  return exports.getLogLevel(defaultLevel, { levels, silent, httpDebug })
}