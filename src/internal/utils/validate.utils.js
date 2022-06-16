// Decode validation types to [fullStr, typeStr, leaveWhiteSpace (*), isArray ([]), isOptional (?)]
const typeRegex = /^([^[?*]+)(\*)?(\[\])?(\?)?$/
exports.getTypeArray = (typeStr) => typeStr && typeStr.match(typeRegex)

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
