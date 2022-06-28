// Get highest value log from Levels array ({ levelName: levelValue, ... })
exports.getMaxEntry = (obj) => Object.entries(obj).reduce((max, [key, val]) => val > max[1] ? [key, val] : max, [null, Number.NEGATIVE_INFINITY])

// Get list of Log Levels from log object
exports.getAllLevels = (logObj) => logObj.reduce((levels, line) =>
  line && line.level && !levels.includes(line.level) ? levels.concat(line.level) : levels,
[])


// Format log files for viewing
const LOCALE = 'en-US'
const formatFileTime = (timestamp) => {
  if (!timestamp) return { full: '-', short: '-' }
  timestamp = new Date(timestamp)
  
  return {
    full: timestamp.toLocaleString().replace(',',''),
    short: `${
      timestamp.toLocaleDateString(LOCALE, {month:'2-digit', day:'2-digit'})
    } ${
      timestamp.toLocaleTimeString(LOCALE, {timeStyle:'short', hour12:false})
    }`,
  }
}

exports.formatFileLog = (line) => {
  if (!line) return null
  line = JSON.parse(line)
  if (line.timestamp) line.timestamp = formatFileTime(line.timestamp)
  return line
}