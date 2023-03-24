import type { LogLevels, LogObject } from '../types/log'
import { parseISO, formatLong, formatShort } from '../libs/date'


/** Get highest value log from Levels array ({ levelName: levelValue, ... }) */
export const getMaxEntry = (obj: Record<string,number>) =>
  Object.entries(obj).reduce<{ key?: string, val?: number }>(
    (max, [key, val]) => typeof max.val !== 'number' || val > max.val ? { key, val } : max,
    {}
  )


/** Get list of Log Levels from log object */
export const getAllLevels = (formattedLog: (LogObject | null)[]) => formattedLog.reduce<LogLevels[]>(
  (levels, entry) => entry?.level && !levels.includes(entry.level) ? levels.concat(entry.level) : levels,
  []
)


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