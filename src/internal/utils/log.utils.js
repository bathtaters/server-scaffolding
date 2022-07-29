const { parseISO, formatLong, formatShort } = require('../libs/date')

// Get highest value log from Levels array ({ levelName: levelValue, ... })
exports.getMaxEntry = (obj) => Object.entries(obj).reduce((max, [key, val]) => val > max[1] ? [key, val] : max, [null, Number.NEGATIVE_INFINITY])

// Get list of Log Levels from log object
exports.getAllLevels = (logObj) => logObj.reduce((levels, line) =>
  line && line.level && !levels.includes(line.level) ? levels.concat(line.level) : levels,
[])


// Format log files for viewing
const formatFileTime = (timestamp) => {
  if (!timestamp) return { full: '-', short: '-' }
  timestamp = parseISO(timestamp)
  
  return {
    full: formatLong(timestamp),
    short: formatShort(timestamp),
  }
}

exports.formatFileLog = (line) => {
  if (!line) return null
  line = JSON.parse(line)
  if ('timestamp' in line) line.timestamp = formatFileTime(line.timestamp)
  return line
}