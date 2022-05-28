const logOrder = [
  { name: 'error', func: console.error },
  { name: 'warn',  func: console.warn  },
  { name: 'log',   func: console.log   },
  { name: 'info',  func: console.info  },
  { name: 'debug', func: console.debug },
]

const logLevel = getLogLevel(process.env.LOG_LEVEL, getLogLevel('info'))

module.exports = logOrder.reduce((logFuncs, { name, func }, idx) => {
  logFuncs[name] = logLevel < idx ? () => {} : func
  return logFuncs
}, {})

module.exports.info(`Log level set to ${logOrder[logLevel].name} (${logLevel} of ${logOrder.length - 1})`)


// Get Log Level from number or log name
function getLogLevel(logLevel, defaultLevel = 100) {
  if (!isNaN(logLevel)) logLevel = +logLevel
  else if (typeof logLevel === 'string') logLevel = logOrder.findIndex(({ name }) => name == logLevel.toLowerCase())
  if (typeof logLevel !== 'number' || logLevel < 0) logLevel = defaultLevel
  return logLevel
}