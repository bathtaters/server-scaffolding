const logger = require('../config/log.adapter')


/* ---- ACCESS ADAPTERS ---- */
// Access is a Bit-map stored as an Int, retrieved as an array

const { access, accessMax } = require('../config/constants/users.cfg')

const noAccess = Object.keys(access).find((key) => !access[key])

exports.accessInt = (accessArray) => {
  if (!isNaN(accessArray)) {
    const accessInt = +accessArray
    if (accessInt <= accessMax && accessInt >= 0) return accessInt
  }
  if (!accessArray) return 0
  if (!Array.isArray(accessArray)) accessArray = [accessArray]
  
  return accessArray.reduce((int, key) => {
    if (!(key in access)) throw new Error("Invalid access type: "+key)
    return int | access[key]
  }, 0)
}

exports.accessArray = (accessInt) => {
  if (!accessInt) return [noAccess]
  if (typeof accessInt === 'string' && !isNaN(accessInt)) accessInt = +accessInt
  if (typeof accessInt !== 'number' || accessInt < 0 || accessInt > accessMax)
    throw new Error("Invalid access int: "+accessInt)
  
  const array = Object.keys(access).filter((key) => access[key] & accessInt)
  return array.length === 0 ? [noAccess] : array
}

exports.hasAccess = (accessInt, accessStr) => (access[accessStr] || 0) & (accessInt || 0)


/* ---- CORS ADAPTERS ---- */
// Allows: String (<url>, *), URL Array, RegExp (match URL), Boolean (true/1 = all, false/0 = none)
// Stored as a STRING, retrieved as one of the above (for cors.origin)

const isJSON = /^\[[^\]]*\]$|^".*"$/
const isRegEx = /^RegExp\(["'](.*)["']\)\s*$/

const regEx = {
  stringify: (re)  => `RegExp("${re.toString().slice(1, -1)}")`,
  parse:     (str) => RegExp(str.match(isRegEx)[1] || logger.warn('Invalid RegExp',str)),
  canString: (re)  => typeof re.compile === 'function',
  canParse:  (str) => isRegEx.test(str),
}

exports.decodeCors = (cors) => {
  if (cors == null) return undefined
  if (cors === "0" || cors === "1") return Boolean(+cors)
  if (cors === "true" || cors === "false") return cors === "true"
  if (regEx.canParse(cors)) return regEx.parse(cors)
  return isJSON.test(cors) ? JSON.parse(cors) : cors
}

exports.encodeCors = (cors) => {
  if (cors == null) return undefined
  if (regEx.canString(cors)) return regEx.stringify(cors)
  if (cors === "true" || cors === "false") return cors
  if (!isNaN(cors)) return JSON.stringify(Boolean(+cors))
  return Array.isArray(cors) ? JSON.stringify(cors) : cors
}