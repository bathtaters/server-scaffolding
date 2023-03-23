const logger = require('../libs/log')
const RegEx = require('../libs/regex')

// Allows: String (<url>, *), URL Array, RegExp (match URL), Boolean (true/1 = all, false/0 = none)
// Stored as a STRING, retrieved as one of the above (for cors.origin)

// Compile CORS RegExps
const jsonRegex  = RegEx(/^\[.*\]$|^".*"$/)
const regExRegex = RegEx(/^RegExp\(["'](.*)["']\)\s*$/)
const commaRegex = RegEx(/\s*,\s*/)

// CORS library
const regEx = {
  stringify: (re)  => `RegExp("${re.toString().slice(1, -1)}")`,
  parse:     (str) => RegEx(str.match(regExRegex)[1] || logger.warn(`Invalid RegExp ${str}`)),
  canString: (re)  => typeof re.compile === 'function',
  canParse:  (str) => regExRegex.test(str),
}

exports.decodeCors = (cors) => {
  if (cors == null) return undefined
  if (cors === "true" || cors === "false") return cors === "true"
  if (cors === "0" || cors === "1" || cors === 0 || cors === 1) return Boolean(+cors)
  const unescCors = cors
  if (regEx.canParse(unescCors)) return regEx.parse(unescCors)
  return jsonRegex.test(cors) ? JSON.parse(cors) : cors
}

exports.encodeCors = (cors) => {
  if (cors == null) return undefined
  if (Array.isArray(cors)) return JSON.stringify(cors)
  if (regEx.canString(cors)) return regEx.stringify(cors)
  if (typeof cors === 'boolean') return cors.toString()
  if (cors === "0" || cors === "1" || cors === 0 || cors === 1) return JSON.stringify(Boolean(+cors))
  if (cors.includes(',')) return JSON.stringify(cors.split(commaRegex))
  return cors
}

exports.displayCors = (cors) => {
  if (!cors) return cors
  if (Array.isArray(cors)) return cors.join(', ')
  if (regEx.canString(cors)) return regEx.stringify(cors)
  return cors
}

exports.isRegEx = (re) => re && regEx.canString(re)