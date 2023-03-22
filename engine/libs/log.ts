import { Logger, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { getLogLevel } from '../services/log.services'
import * as config from '../config/log.cfg'
import { definitions } from '../config/settings.cfg'
import { logPath } from '../config/meta'
import { LogType } from '../types/process'

const consoleLogs = new transports.Console({
  ...getLogLevel(process.env.LOG_CONSOLE, config, definitions.LOG_CONSOLE.default, true),
  format: config.logFormat.console,
})

const fileLogs = !config.testLevel ? null : new DailyRotateFile({
  ...getLogLevel(process.env.LOG_FILE, config, definitions.LOG_FILE.default),
  filename: logPath,
  datePattern: 'YYYY-MM-DD' + (config.files.splitHourly ? '.HH' : ''),
  zippedArchive: false,
  maxSize: config.files.maxBytes || '20M',
  maxFiles: (config.files.maxDays || 14) + 'd',
  format: config.logFormat.file,
})

const logger = new Logger({
  levels: config.levels,
  format: config.logFormat.common,
  transports: fileLogs ? [consoleLogs, fileLogs] : [consoleLogs],
})

logger.debug = () => logger.warn('Calling uninitialized logger.debug')

// @ts-ignore -- https://github.com/winstonjs/winston/issues/1385
logger.stream = { write: (msg) => logger.http(msg.trim()) } // Adapter for Morgan.stream

logger.verbose(logger.transports.map(
  ({ level, silent }, idx) => config.initMessage(['console','file'][idx], silent ? config.silent[0] : (level || logger.level) as LogType)).join(', ')
)

export default logger