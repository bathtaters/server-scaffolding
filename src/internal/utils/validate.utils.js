const { boolOptions } = require('../config/validate.cfg')

// Decode validation types to [fullStr, typeStr, leaveWhiteSpace (*), isArray ([]), isOptional (?)]
const typeRegex = /^([^[?*]+)([?*]|\[\])?([?*]|\[\])?([?*]|\[\])?$/
exports.parseTypeStr = (typeStr) => {
  if (!typeStr) return {}
  const match = typeStr.toLowerCase().match(typeRegex)
  if (!match) return {}
  const opts = match.slice(2,5)
  return {
    string: match[0], type: match[1],
    isOptional: opts.includes('?'),
    isArray: opts.includes('[]'),
    hasSpaces: opts.includes('*'),
  }
}

// Get validation & limits from html object { key, type, limits }
const html2Valid = ({ type, limits }, key, isIn = 'body') => ({
  key, isIn,
  typeStr: type === 'number' ? 'int' : 'string',
  limits: limits || (Array.isArray(type) && type.length && {
    min: Math.min(...type.map((str) => String(str).length || 0)),
    max: Math.max(...type.map((str) => String(str).length || 0)),
  })
})
exports.formSettingsToValidate = (formSettings, isIn = 'body') => Object.entries(formSettings).map(([key, val]) => html2Valid(val, key, isIn))

// Boolean validation
const allBools    = boolOptions.true.concat(boolOptions.false)
const boolStrings = boolOptions.true.concat(boolOptions.false).filter((val) => typeof val === 'string').map((val) => val.toLowerCase())
const falseBools  = boolOptions.false.filter((val) => typeof val === 'string').map((val) => val.toLowerCase())
const boolTypes   = boolOptions.types.map((val) => val.toLowerCase()).filter((val) => val !== 'string')

exports.isBoolean = (loose = boolOptions.loose) => !loose ? (val) => allBools.includes(val) :
  (val) => typeof val === 'string' ? boolStrings.includes(val.toLowerCase()) : boolTypes.includes(typeof val)
exports.parseBoolean = (loose = boolOptions.loose) => !loose ? (val) => !boolOptions.false.includes(val) :
  (val) => typeof val === 'string' ? !falseBools.includes(val.toLowerCase()) : Boolean(val)

