const RegEx = require('../libs/regex')
const { varNameDict, MASK_CHAR } = require(require('../src.path').config+'gui.cfg')
const { isDate } = require('../libs/date')

const varRegex = [ RegEx(/([A-Z])/g), RegEx(/^./) ]
exports.varName = (str) =>  typeof str !== 'string' ? str : Object.keys(varNameDict).includes(str) ? varNameDict[str] :
  str.charAt(0) === '_' ? exports.varName(str.slice(1)) :
  str.replace(varRegex[0], ' $1').replace(varRegex[1], (ltr) => ltr.toUpperCase())

// Get KEYS from schema
exports.getTableFields = (schema, idKey) => {
  let keys = Object.keys(schema || {})

  // Move ID to start
  const idIdx = keys.map((k) => k.toLowerCase()).indexOf(idKey.toLowerCase())
  if (idIdx > 0) keys.unshift(keys.splice(idIdx,1)[0])

  const tf = keys.reduce((fields, key) => Object.assign(fields, { [key]: exports.varName(key) }), {})
  return tf
}

// Default 'formatData' callback for GUI
exports.formatGuiData = (data) => {
  if (Array.isArray(data)) data.forEach((row) => exports.formatGuiData(row))
  
  else if (typeof data === 'object' && data) Object.entries(data).forEach(([key,val]) => {
    if (Array.isArray(val)) {
      data[key] = val.map((e) => {
        switch (typeof e) {
          case 'string': return e
          case 'object': if (e && !isDate(e)) return JSON.stringify(e)
          default: return e != null ? e.toLocaleString() : `${e}`
        }
      }).join(', ')
    } else if (typeof val === 'object' && val && !isDate(val)) {
      data[key] = JSON.stringify(val)
    }
  })
  return data
}

exports.mask = (value) => {
  // Recursively mask
  if (Array.isArray(value))
    return value.map(exports.mask)
  if (value && typeof value === 'object')
    return Object.entries(value).reduce((obj,[key,val]) => ({ ...obj, [key]: exports.mask(val) }), {})

  // Mask literals
  switch (typeof value) {
    case 'number':
    case 'bigint': value = value.toString()
    case 'string': return MASK_CHAR.repeat(value.length)
    case 'object':
    case 'undefined': return String(value)
  }
  // Mask others (bool, func, symbol)
  return `[${typeof value}]`
}