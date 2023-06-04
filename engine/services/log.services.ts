import type * as config from '../config/log.cfg'
import type { LogLevels } from '../types/log.d'
import { logLevels } from '../types/log'
import { readdir, readFile } from 'fs/promises'
import { join, parse } from 'path'
import { formatFileLog, getMaxEntry } from '../utils/log.utils'
import { logViewFileFilter } from '../config/log.cfg'
import { logPath as fullLogPath } from '../config/meta'

const logPath = parse(fullLogPath)
const logFileRegex = logViewFileFilter(logPath.base)

/** Get all log files */ 
export const getLogList = (folder = logPath.dir) =>
  readdir(folder).then((files) =>
    files.filter((filename) => logFileRegex.test(filename)).sort((a,b) => b.localeCompare(a))
  )


/** Get one log file */ 
export async function logFile(filename: string, folder = logPath.dir) {
  const [ files, log ] = await Promise.all([
    getLogList(folder),

    readFile(join(folder, filename))
      .then((log) => log.toString().split('\n').map(formatFileLog).filter(Boolean)),
  ])

  const idx = files.indexOf(filename)
  if (idx < 0) return { log }

  return { log, prev: files[idx + 1], next: files[idx - 1] }
}


/** Normalize log level */
export function getLogLevel(
  logLevel: any,
  { levels, testLevel, silent, httpDebug }: Pick<typeof config, 'levels'|'testLevel'|'silent'|'httpDebug'>,
  defaultLevel?: string,
  isConsole = false
): { level?: LogLevels, silent?: boolean } {
  if (process.env.NODE_ENV === 'test' && testLevel) logLevel = isConsole ? testLevel : silent[0]

  if (!logLevel && defaultLevel && defaultLevel in logLevels) logLevel = defaultLevel

  if (typeof logLevel === 'string') logLevel = logLevel.toLowerCase()

  if (logLevel in logLevels) return { level: logLevel }
  if (silent.includes(logLevel)) return { silent: true }
  if (httpDebug.includes(logLevel)) return { level: getMaxEntry(levels).key || 'verbose' }

  if (!defaultLevel) throw new Error(`Invalid default log level: ${logLevel}`)
  return getLogLevel(defaultLevel, { levels, silent, httpDebug, testLevel: false })
}
