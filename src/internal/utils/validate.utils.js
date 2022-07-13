// Decode validation types to [fullStr, typeStr, leaveWhiteSpace (*), isArray ([]), isOptional (?)]
const typeRegex = /^([^[?*]+)(\*)?(\[\])?(\?)?$/
exports.getTypeArray = (typeStr) => typeStr && typeStr.match(typeRegex)

// Get validation & limits from html object { key, type, limits }
const html2Valid = ({ type, limits }, key, isIn = 'body') => ({
  key, isIn,
  typeStr: type === 'number' ? 'int' : 'string',
  limits: limits || (Array.isArray(type) && {
    min: Math.min(...type.map((str) => str.length || 0)) || 0,
    max: Math.max(...type.map((str) => str.length || 0)) || undefined,
  })
})
exports.formSettingsToValidate = (formSettings, isIn = 'body') => Object.entries(formSettings).map(([key, val]) => html2Valid(val, key, isIn), {})

// Boolean rules
const boolRules = {
  true:  [true,  1, '1', 'true', 'yes',  'on'],
  false: [false, 0, '0', 'false', 'no', 'off', ''],
  types: ['string', 'number', 'boolean'],
  loose: true, // case-insensitive & convert using Boolean() [false: anything not in 'false' => true]
}
exports.looseBools = boolRules.loose // export for testing

const allBools    = boolRules.true.concat(boolRules.false)
const boolStrings = boolRules.true.concat(boolRules.false).filter((val) => typeof val === 'string').map((val) => val.toLowerCase())
const falseBools  = boolRules.false.filter((val) => typeof val === 'string').map((val) => val.toLowerCase())
const boolTypes   = boolRules.types.map((val) => val.toLowerCase()).filter((val) => val !== 'string')

exports.isBoolean = !boolRules.loose ? (val) => allBools.includes(val) :
  (val) => typeof val === 'string' ? boolStrings.includes(val.toLowerCase()) : boolTypes.includes(typeof val)
exports.parseBoolean = !boolRules.loose ? (val) => !boolRules.false.includes(val) :
  (val) => typeof val === 'string' ? !falseBools.includes(val.toLowerCase()) : Boolean(val)

// Setup date-only parsing
const strictDates = true
exports.dateOptions = {
  date: { format: 'YYYY-MM-DD', strict: strictDates, delimiters: ['-'] },
  time: { strict: strictDates, strictSeparator: strictDates },
}

// Recursively unescape strings using 'unescaper'
const unescaper = require('validator').default.unescape
exports.deepUnescape = (input) => {
  if (typeof input === 'string') return unescaper(input)
  
  if (Array.isArray(input))
    input.forEach((val, idx) => {
      input[idx] = exports.deepUnescape(val)
    })
  
  else if (input && typeof input === 'object')
    Object.keys(input).forEach((key) => {
      input[key] = exports.deepUnescape(input[key])
    })

  return input
}

// Count escaped string (each escaped char counts as 1)
const ESC_START = '&', ESC_END = ';', ESC_MAX_INT_LEN = 5 // Escaping params
exports.escapedLength = ({ options, errorMessage }) => ({
  errorMessage,
  options: (value) => {
    if (!options || !options.min && !options.max) return true
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
