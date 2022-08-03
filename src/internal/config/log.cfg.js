const { format } = require('winston')
const RegEx = require('../libs/regex')
const { varName } = require('../utils/gui.utils')
const { getMaxEntry } = require('../utils/log.utils')

const levels = { error: 0, warn: 1, info: 2, http: 3, verbose: 4 }
const colors = { error: 'red', warn: 'yellow', info: 'green', http: 'cyan', verbose: 'gray' }

const varRegex = RegEx(/%[^%]+%/g)
const additLines = RegEx(/\s*\r?\n.*$/)

module.exports = {
  levels, colors,

  files: {
    splitHourly: false, // false = Daily
    maxBytes: '25M', // can use k/m/g suffix
    maxDays: 30, 
  },

  silent: ['none', 'silent'], // Disable
  httpDebug: ['debug'],       // Enable max verbosity for requests/responses

  initMessage: (name, level) => `${varName(name)} log mode: ${level || 'unknown'}${level in levels ? ` (${levels[level] + 1} of ${(getMaxEntry(levels)[1] || -1) + 1})` : ''}`,
  httpMessage: (mode) => `HTTP request logging enabled (${mode || 'DEBUG MODE'})`,

  // Filter for logView
  logViewFileFilter: (filename) => RegEx(`^${RegEx.escapeRegexPattern(filename).replace(varRegex,'.+')}$`),

  logFormat: {
    common: format.combine(
      format.errors({ stack: true }),
    ),
    file: format.combine(
      format((info) => 'NODE_APP_INSTANCE' in process.env ? { ...info, instance: +process.env.NODE_APP_INSTANCE } : info)(),
      format.uncolorize(),
      format.timestamp(),
      format.json(),
    ),
    console: format.combine(
      format((info) => typeof info.label === 'string' ? { ...info, level: `${info.level} [${info.label}]` } : info)(),
      format.colorize({ colors }),
      format.padLevels(),
      format.printf(({ level, message, stack }) => `${level}: ${stack || message}`),
      // format.json()
    ),
  },
  
  // Handle long log lines in Log GUI
  maxLogLine: 128,
  trimLogMessage: (line) => line.label ? '' : line.message.trim().length ? `${(line.message.trim()).slice(0,48).replace(additLines,'')}...` : 'View Details',

  // Get test log level from test.cfg
  testLevel: process.env.NODE_ENV === 'test' && require('../testing/test.cfg').testLog,
}