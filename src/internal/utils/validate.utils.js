const { unescape } = require('validator').default
const { deepMap } = require('./common.utils')
const { boolOptions } = require('../config/validate.cfg')

// Decode validation types to [fullStr, typeStr, leaveWhiteSpace (*), isArray ([]), isOptional (?)]
const typeRegex = /^([^[?*]+)(\*)?(\[\])?(\?)?$/
exports.getTypeArray = (typeStr) => typeStr && typeStr.toLowerCase().match(typeRegex)

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

// Recursively unescape strings using 'unescaper'
exports.deepUnescape = (input) => deepMap(input, (val) => typeof val === 'string' ? unescape(val) : val)

// Count escaped string (each escaped char counts as 1)
const ESC_START = '&', ESC_END = ';', ESC_MAX_INT_LEN = 5 // Escaping params
exports.escapedLength = ({ options, errorMessage }) => ({
  errorMessage,
  options: (value) => {
    if (!options || (!options.min && !options.max)) return true
    if (typeof value !== 'string') return false

    let count = 0, isEsc = false, reserve
    for (const c of value) {
      if (c === ESC_START) {
        if (reserve) count += reserve
        isEsc = true
        reserve = 0
      } else if (isEsc) {
        const isEnd = c === ESC_END
        if (isEnd || reserve > ESC_MAX_INT_LEN) {
          if (!isEnd) count += reserve
          isEsc = false
          reserve = 0
        }
      }
      isEsc ? reserve++ : count++
    }
    if (reserve) count += reserve
    return (!options.min || count >= options.min) && (!options.max || count <= options.max)
  }
})
