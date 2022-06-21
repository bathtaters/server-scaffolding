const { format } = require('winston')
const { varName } = require('../utils/gui.utils')
const { getMaxEntry } = require('../utils/log.utils')

const levels = { error: 0, warn: 1, info: 2, http: 3, verbose: 4 }

module.exports = {
  levels,

  files: {
    splitHourly: false, // false = Daily
    maxBytes: '25M', // can use k/m/g suffix
    maxDays: 30, 
  },

  defaultLevel: { console: 'info', file: 'warn' },
  defaultHttp: 'common',
  silent: ['none', 'silent'], // Disable
  httpDebug: ['debug'],       // Enable max verbosity for requests/responses
  testLevel: 'warn', // Force this level when testing & disable files, falsy value will ignore this

  initMessage: (name, level) => `${varName(name)} log mode: ${level || 'unknown'}${level in levels ? ` (${levels[level] + 1} of ${(getMaxEntry(levels)[1] || -1) + 1})` : ''}`,
  httpMessage: (mode) => `HTTP request logging enabled (${mode || 'DEBUG MODE'})`,

  logFormat: {
    common: format.combine(
      format.errors({ stack: true }),
      format((info) => typeof info.label === 'string' ? { ...info, level: `${info.level} [${info.label}]` } : info)(),
    ),
    file: format.combine(
      format.uncolorize(),
      format.timestamp(),
      format.json(),
    ),
    console: format.combine(
      format.colorize({ colors: { http: 'cyan', verbose: 'gray' }}),
      format.padLevels(),
      format.printf(({ level, message, stack }) => `${level}: ${stack || message}`),
      // format.json()
    ),
  },
}