const { createLogger, transports } = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const { getLogLevel } = require('../utils/log.utils')
const config = require('./log.cfg')
const { logPath } = require('../../config/meta')

const logger = createLogger({
  levels: config.levels,
  format: config.logFormat.common,
  transports: [
    // Console logs
    new transports.Console({
      ...getLogLevel(process.env.LOG_CONSOLE, config, 'console'),
      format: config.logFormat.console,
    }),

    // File logs
    new DailyRotateFile({
      ...getLogLevel(process.env.LOG_FILE, config, 'file'),
      filename: logPath,
      datePattern: 'YYYY-MM-DD' + (config.splitFilesHourly ? '.HH' : ''),
      zippedArchive: true,
      maxSize: '25m',
      maxFiles: '30d',
      format: config.logFormat.file,
    }),
  ],
  silent: process.env.NODE_ENV === 'test',
})

logger.debug = () => logger.warn('Calling uninitialized logger.debug') 
logger.stream = { write: (msg) => logger.http(msg.trim()) } // Adapter for Morgan.stream

logger.verbose(logger.transports.map(
  ({ level, silent }, idx) => config.initMessage(['console','file'][idx], silent ? config.silent[0] : level || logger.level)).join(', ')
)

module.exports = logger