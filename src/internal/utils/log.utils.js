// Formatting used for writing files
exports.formatFileArgs = (arg) => !arg || typeof arg !== 'object' ? String(arg) : arg.stack ? arg.stack : JSON.stringify(arg)

// Converting buffer data for debug log
exports.decodeBuffer = (type, data, enc) => 
  !Buffer.isBuffer(data) ? data :
  type.includes('html') ? `[HTML: ${data.byteLength.toLocaleString()} bytes]` :
  type.includes('json') ? JSON.parse(data.toString(enc)) :
  /* other: */ data.toString(enc)

// Convert maxLevels from Ints to Names
exports.logNames = (maxLevels, getName) => Object.entries(maxLevels).reduce((levels, [type, level]) =>
  Object.assign(levels, { [type]: getName(level) }),
{})

// Build function based on MaxLevel settings
const ignoreFunc = () => {}
exports.getFunction = (currLevel, maxLevels, getArg, getFunc) => {
  let funcs = []
  Object.keys(maxLevels).forEach((key) => {
    if (getFunc[key] && maxLevels[key] >= currLevel) funcs.push(getFunc[key](getArg))
  })

  if (funcs.length < 2) return funcs[0] || ignoreFunc
  return function aggregate(...args) { funcs.forEach((func) => func(...args)) }
}

// Get Log Level from number or log name
exports.getLogLevel = (logOrder, logLevel, defaultLevel) => {
  if (!isNaN(logLevel)) logLevel = +logLevel
  else if (typeof logLevel === 'string') logLevel = logOrder.indexOf(logLevel.toLowerCase())
  if (typeof logLevel !== 'number' || logLevel < 0) logLevel = defaultLevel
  return logLevel
}
