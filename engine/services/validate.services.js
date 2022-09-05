const logger = require('../libs/log')
const { errorMsgs, dateOptions, ignoreDisableMin, defaultLimits } = require("../config/validate.cfg")
const { isBoolean, parseBoolean } = require('../utils/validate.utils')
const { parseTypeStr } = require('../utils/model.utils')

// Obscure 'min' field (For allowing partial validation on searches) from limit
const hidingMin = ({ min, ...other }) => other

// Generate Validation Schema object based on typeString/limits/etc (exported to simplify testing)
exports.toValidationSchema = function toValidationSchema(
  key, { typeStr, type, isOptional, isArray, hasSpaces, limits }, isIn, forceOptional = false, disableMin = false
) {
  if (!isIn || !isIn.length) throw new Error(errorMsgs.missingIn(key))

  // Get type from typeStr
  if (!type) throw new Error(errorMsgs.missing(key, typeStr))
  if (forceOptional && !isOptional) isOptional = 'force'
  if (hasSpaces && type !== 'string') logger.warn(`* is ignored w/ non-string type: ${typeStr}`)

  // Initialize ptr & static values (errMsg/in)
  let valid = { [key]: {} }
  let ptr = valid[key]
  ptr.errorMessage = errorMsgs.type(typeStr)
  ptr.in = isIn

  // Add validation for optionals/non-optionals
  if (isOptional) {
    ptr.optional = { options: { nullable: true, checkFalsy: type !== 'boolean' } }
  } else {
    ptr.exists = { errorMessage: errorMsgs.exists() }
  }

  // Handle validation for array elements
  if (isArray) {
    // Set limits
    let arrLimit
    if (limits && (limits.array || limits.elem)) {
      arrLimit = limits.array
      limits = limits.elem
    } else {
      arrLimit = limits
      limits = undefined
    }
    ptr.isArray = arrLimit || arrLimit === undefined ?
      { options: arrLimit || defaultLimits.array, errorMessage: errorMsgs.limit(arrLimit, 'array') } :
      { errorMessage: errorMsgs.array() }
    ptr.toArray = isOptional
    
    // Create entry & update ptr
    valid[key+'.*'] = {}
    ptr = valid[key+'.*']

    // Set statics for new entry
    ptr.errorMessage = errorMsgs.type(type)
    ptr.in = isIn
  }

  // Normalize and get default limits
  if (limits && (limits.array || limits.elem)) limits = limits.elem
  if (limits === undefined) limits = defaultLimits[type]

  // Allow empty strings (only if string minimum is >= 0)
  if (!isOptional && !isArray && type === 'string' && (!limits || !limits.min))
    valid[key].optional = { options: { checkFalsy: true } }

  // Build options object for limits
  if (limits) {
    if (disableMin && !ignoreDisableMin.includes(type)) limits = hidingMin(limits) // Remove minimum
    limits = { options: limits, errorMessage: errorMsgs.limit(limits, type) }
  }

  // Set type-specific validators/sanitizers
  switch (type) {
    case 'b64': 
    case 'b64url': // pass to string
      ptr.isBase64 = { options: { urlSafe: type === 'b64url' }, errorMessage: errorMsgs.b64() }
    case 'uuid': // pass to string
      if (!ptr.isBase64)
        ptr.isUUID = { errorMessage: errorMsgs.uuid() }
    case 'hex': // pass to string
      if (!ptr.isBase64 && !ptr.isUUID)
        ptr.isHexadecimal = { errorMessage: errorMsgs.hex() }
    case 'string':
      ptr.isString = { errorMessage: errorMsgs.string() }
      if (limits) ptr.isLength = limits
      if (!hasSpaces) { 
        ptr.stripLow = true
        ptr.trim = true
      }
      break
    case 'float':
      ptr.isFloat = limits || { errorMessage: errorMsgs.float() }
      ptr.toFloat = true
      break
    case 'int':
      ptr.isInt = limits || { errorMessage: errorMsgs.int() }
      ptr.toInt = true
      break
    case 'boolean':
      ptr.custom = { options: isBoolean(), errorMessage: errorMsgs.boolean() }
      ptr.customSanitizer = { options: parseBoolean() }
      break
    case 'datetime':
      ptr.isISO8601 = { options: dateOptions.time, errorMessage: errorMsgs.datetime() }
      ptr.toDate = true
      break
    case 'date':
      ptr.isDate = { options: dateOptions.date, errorMessage: errorMsgs.date() }
      ptr.trim = true
      break
    case 'object': ptr.isJSON = { options: { allow_primitives: false }, errorMessage: errorMsgs.object() }
    case 'any':  // pass to default
    default: break
  }
  return valid
}


// Generate schema object based on Types + Limits objects
const IGNORE_OPTIONAL = Object.freeze(['params'])
exports.generateSchema = (name, data, isIn = ['params'], forceOptionalFields = false, disableMin = false) =>
  exports.toValidationSchema(
    name, data, isIn,
    forceOptionalFields && !isIn.some((key) => IGNORE_OPTIONAL.includes(key)),
    disableMin
  )


// Add additional validation to schema (overwrites matching keys)
exports.appendToSchema = function appendToSchema(schema = {}, additional = []) {
  additional.forEach((data) => {
    // Check 'isIn' value
    if (!data.isIn) return logger.warn(`Missing "isIn" for key "${data.key}" from additional validator`)
    if (!Array.isArray(data.isIn)) data.isIn = [data.isIn]

    // If key already exists, just add missing 'in' values
    if (data.key in schema)
      return data.isIn.forEach((entry) => schema[data.key].in.includes(entry) || schema[data.key].in.push(entry))

    // Append to schema
    parseTypeStr(data)
    Object.entries(
      exports.toValidationSchema(data.key, data, data.isIn)
    ).forEach(([key,val]) => schema[key] = val)
  })
  return schema
}