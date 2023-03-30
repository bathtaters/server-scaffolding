import { logLevels, LogLevels, LogObject } from '../types/log.d'
import { parseISO, formatLong, formatShort } from '../libs/date'


/** Get highest value log from Levels array ({ levelName: levelValue, ... }) */
export const getMaxEntry = <Key extends string>(obj: Record<Key,number>) =>
  Object.entries<number>(obj).reduce<{ key?: Key, val?: number }>(
    (max, [key, val]) =>
      typeof max.val !== 'number' || val > max.val ?
        { key: key as Key, val } : max,
    {}
  )


/** Get list of Log Levels from log object */
export const getAllLevels = (formattedLog: (LogObject | null)[]) => formattedLog.reduce<LogLevels[]>(
  (levels, entry) => entry?.level && !levels.includes(entry.level) ? levels.concat(entry.level) : levels,
  []
)


/** Check that a string is a valid logLevel, if not throw an error */
export const isLogLevel = (logLevel: string, levelType = ''): logLevel is LogLevels => {
  if (logLevel in logLevels) return true
  throw new Error(`${levelType}LogLevel "${logLevel}" is not valid. Must be one of: "${Object.values(logLevels).join('", "')}"`)
}


/** Format log file time */
const formatFileTime = (timestamp: string) => {
  if (!timestamp) return { full: '-', short: '-' }

  const parsed = parseISO(timestamp)

  return {
    full: formatLong(parsed),
    short: formatShort(parsed),
  }
}


/** Format log file for UI */
export const formatFileLog = (entry: string) => {
  if (!entry) return null

  const entryObj = JSON.parse(entry) as LogObject
  if ('timestamp' in entryObj) entryObj.timestamp = formatFileTime(entryObj.timestamp)
  return entryObj
}