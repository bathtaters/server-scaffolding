const { createLogger, transports } = require('winston')
const DailyRotateFile = require('winston-daily-rotate-file')
const { getLogLevel } = require('../services/log.services')
const config = require('../config/log.cfg')
const { definitions } = require('../config/settings.cfg')
const { logPath } = require('../config/meta')

const logger = createLogger({
  levels: config.levels,
  format: config.logFormat.common,
  transports: [
    // Console logs
    new transports.Console({
      ...getLogLevel(process.env.LOG_CONSOLE, config, definitions.LOG_CONSOLE.default, true),
      format: config.logFormat.console,
    })
    
  ].concat(config.testLevel ? [] : 
    // File logs
    new DailyRotateFile({
      ...getLogLevel(process.env.LOG_FILE, config, definitions.LOG_FILE.default),
      filename: logPath,
      datePattern: 'YYYY-MM-DD' + (config.files.splitHourly ? '.HH' : ''),
      zippedArchive: false,
      maxSize: config.files.maxBytes || '20M',
      maxFiles: (config.files.maxDays || 14) + 'd',
      format: config.logFormat.file,
    })
  )
})

logger.debug = () => logger.warn('Calling uninitialized logger.debug') 
logger.stream = { write: (msg) => logger.http(msg.trim()) } // Adapter for Morgan.stream

logger.verbose(logger.transports.map(
  ({ level, silent }, idx) => config.initMessage(['console','file'][idx], silent ? config.silent[0] : level || logger.level)).join(', ')
)

module.exports = logger