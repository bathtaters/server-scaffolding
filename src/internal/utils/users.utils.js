const errors = require('../config/errors.internal')
const logger = require('../config/log')


/* ---- ACCESS ADAPTERS ---- */
// Access is a Bit-map stored as an Int, retrieved as an array

const { access, accessMax, requirePassword } = require('../config/users.cfg')
const { deepUnescape } = require('./validate.utils')

const noAccess = Object.keys(access).find((key) => !access[key])

exports.accessInt = (accessArray) => {
  if (!isNaN(accessArray)) {
    const accessInt = +accessArray
    if (accessInt <= accessMax && accessInt >= 0) return accessInt
  }
  if (!accessArray) return 0
  if (!Array.isArray(accessArray)) accessArray = [accessArray]
  
  return accessArray.reduce((int, key) => {
    if (!(key in access)) throw errors.badAccess(key, 'key')
    return int | access[key]
  }, 0)
}

exports.accessArray = (accessInt) => {
  if (!accessInt) return [noAccess]
  if (typeof accessInt === 'string' && !isNaN(accessInt)) accessInt = +accessInt
  if (typeof accessInt !== 'number' || accessInt < 0 || accessInt > accessMax)
    throw errors.badAccess(accessInt, 'int')
  
  const array = Object.keys(access).filter((key) => access[key] & accessInt)
  return array.length === 0 ? [noAccess] : array
}

exports.hasAccess = (accessIntA, accessIntB) => (accessIntA || 0) & (accessIntB || 0)

exports.passwordAccess = exports.accessInt(requirePassword)


/* ---- MODEL ADAPTERS ---- */
// Model is an object w/ Bit-maps stored as an Ints
const { models, modelsMax, allModels, noModelAccessChar } = require('../config/users.cfg')

const wrapAccess = (access) => `[${access}]`
const wrapRegex = RegExp(`^\\${wrapAccess('(.*)')}$`)

exports.modelAccessStr = (modelInt) => {
  if (!modelInt) return noModelAccessChar
  // if (typeof modelInt === 'string' && !isNaN(modelInt)) modelInt = +modelInt
  if (typeof modelInt !== 'number' || modelInt < 0 || modelInt > modelsMax)
    throw errors.badAccess(modelInt, 'modelInt')

  return Object.keys(models).filter((key) => models[key] & modelInt)
    .map((key) => key.charAt(0)).join('') || noModelAccessChar
}

exports.modelAccessInt = (modelStr) => {
  if (!modelStr || typeof modelStr !== 'string') return 0
  
  // const wrapMatch = modelStr.match(wrapRegex)
  // if (wrapMatch) modelStr = wrapMatch[1]
  if (!modelStr || modelStr === noModelAccessChar) return 0
  
  return [...modelStr].reduce((int, letter) => {
    const key = Object.keys(models).find((key) => letter === key.charAt(0))
    if (!key) throw errors.badAccess(key, 'model key')
    return int | models[key]
  }, 0)
}

exports.hasModelAccess = (modelObj, modelName, accessType = modelsMax) => {
  if (!modelObj) return false

  const modelsInt = typeof accessType === 'number' ? accessType : models[accessType] || 0

  if (modelName in modelObj) return modelObj[modelName] & modelsInt
  return modelObj[allModels[0]] & modelsInt
}

exports.getModelsString = (modelObj) => Object.entries(modelObj)
  .map(([key, int]) => `${key === allModels[0] ? allModels[1] : key}${wrapAccess(exports.modelAccessStr(int))}`).join(', ')


/* ---- CORS ADAPTERS ---- */
// Allows: String (<url>, *), URL Array, RegExp (match URL), Boolean (true/1 = all, false/0 = none)
// Stored as a STRING, retrieved as one of the above (for cors.origin)

const isJSON = /^\[[^\]]*\]$|^".*"$/
const isRegEx = /^RegExp\(["'](.*)["']\)\s*$/

const regEx = {
  stringify: (re)  => `RegExp("${re.toString().slice(1, -1)}")`,
  parse:     (str) => RegExp(str.match(isRegEx)[1] || logger.warn(`Invalid RegExp ${str}`)),
  canString: (re)  => typeof re.compile === 'function',
  canParse:  (str) => isRegEx.test(str),
}

exports.decodeCors = (cors) => {
  if (cors == null) return undefined
  if (cors === "true" || cors === "false") return cors === "true"
  if (cors === "0" || cors === "1" || cors === 0 || cors === 1) return Boolean(+cors)
  const unescCors = deepUnescape(cors)
  if (regEx.canParse(unescCors)) return regEx.parse(unescCors)
  return isJSON.test(cors) ? JSON.parse(cors) : cors
}

exports.encodeCors = (cors) => {
  if (cors == null) return undefined
  if (Array.isArray(cors)) return JSON.stringify(cors)
  if (regEx.canString(cors)) return regEx.stringify(cors)
  if (cors === "true" || cors === "false") return cors
  if (cors === "0" || cors === "1" || cors === 0 || cors === 1) return JSON.stringify(Boolean(+cors))
  if (cors.includes(',')) return JSON.stringify(cors.split(/\s*,\s*/))
  return cors
}

exports.displayCors = (cors) => {
  if (!cors) return cors
  if (Array.isArray(cors)) return cors.join(', ')
  if (regEx.canString(cors)) return regEx.stringify(cors)
  return cors
}

exports.isRegEx = (re) => re && regEx.canString(re)