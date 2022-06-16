const { varName } = require('../utils/gui.utils')

module.exports = {
  defaultLevels: { console: 'info', file: 'warn' },
  defaultMorgan: { console: 'short', file: 'common' },

  initMessage: (order) => ([name, level]) => `${varName(name)} log set to ${order[level] || `level ${level}`} (${level} of ${order.length - 1})`,
  mkDirMsg: (dir) => `Created folder for logs: ${dir || '.'}`,
  verboseMsg: 'Verbose request/response logging enabled',
  
  logOrder: [ 'none', 'error', 'warn', 'log', 'info', 'debug' ].map((name) => name.toLowerCase()),

  autoEnableVerbose: (logLevel) => Object.values(logLevel).some((level) => typeof level === 'number' ? level > 4 : level === 'debug'),
}