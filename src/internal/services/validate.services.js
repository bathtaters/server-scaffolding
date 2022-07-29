const logger = require('../libs/log')
const { errorMsgs, dateOptions, ignoreDisableMin } = require("../config/validate.cfg")
const { parseTypeStr, isBoolean, parseBoolean } = require('../utils/validate.utils')

// Obscure 'min' field (For allowing partial validation on searches) from limit
const hidingMin = ({ min, ...other }) => other

// Generate Validation Schema object based on typeString/limits/etc (exported to simplify testing)
exports.toValidationSchema = function toValidationSchema(key, typeStr, limits, isIn, forceOptional = false, disableMin = false) {
  if (!isIn || !isIn.length) throw new Error(errorMsgs.missingIn(key))

  // Get type from typeStr
  const type = parseTypeStr(typeStr)
  if (!type.type) throw new Error(errorMsgs.missing(key, typeStr))
  if (forceOptional) type.isOptional = '?'
  if (type.hasSpaces && type.type !== 'string') logger.warn(`* is ignored w/ non-string type: ${type.string}`)

  // Initialize ptr & static values (errMsg/in)
  let valid = { [key]: {} }
  let ptr = valid[key]
  ptr.errorMessage = errorMsgs.type(type.string)
  ptr.in = isIn

  // Add validation for optionals/non-optionals
  if (type.isOptional) {
    ptr.optional = { options: { nullable: true, checkFalsy: type.type !== 'boolean' } }
  } else {
    ptr.exists = { errorMessage: errorMsgs.exists() }
    
    // Skip validation of empty strings (only if empty strings are allowed)
    if (type.type === 'string' && (!limits || (!limits.min && !limits.elem) || ((limits.elem || limits).min === 0))) {
      ptr.optional = { options: { checkFalsy: true } }
    }
  }

  // Handle validation for array elements
  if (type.isArray) {
    // Set limits
    let arrLimit
    if (limits && (limits.array || limits.elem)) {
      arrLimit = limits.array
      limits = limits.elem
    } else {
      arrLimit = limits
      limits = null
    }
    ptr.isArray = { options: arrLimit, errorMessage: errorMsgs.limit(arrLimit || 'array') }
    
    // Create entry & update ptr
    valid[key+'.*'] = {}
    ptr = valid[key+'.*']

    // Set statics for new entry
    ptr.errorMessage = errorMsgs.type(type.type)
    ptr.in = isIn
  }

  // Pass limits as options
  if (limits && (limits.array || limits.elem)) limits = limits.elem
  if (limits) {
    if (disableMin && !ignoreDisableMin.includes(type.type)) limits = hidingMin(limits) // Remove minimum
    limits = { options: limits, errorMessage: errorMsgs.limit(limits, type.type === 'string') }
  }

  // Set type-specific validators/sanitizers
  switch (type.type) {
    case 'b64': 
    case 'b64url': // pass to string
      ptr.isBase64 = { options: { urlSafe: type.type === 'b64url' }, errorMessage: errorMsgs.b64() }
    case 'uuid': // pass to string
      if (!ptr.isBase64)
        ptr.isUUID = { options: 4, errorMessage: errorMsgs.uuid() }
    case 'hex': // pass to string
      if (!ptr.isBase64 && !ptr.isUUID)
        ptr.isHexadecimal = { errorMessage: errorMsgs.hex() }

    case 'string':
      ptr.isString = limits || { errorMessage: errorMsgs.string() }
      if (!type.hasSpaces) { 
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
    case 'object': ptr.isJSON = { options: { allow_primitives: true }, errorMessage: errorMsgs.object() }
    case 'any':  // pass to default
    default: break
  }

  return valid
}


// Generate schema object based on Types + Limits objects
const OPTIONAL_FIELDS = Object.freeze(['body','query'])
exports.generateSchema = function generateSchema(name, typeStr, limits, isIn = ['params'], forceOptionalFields = false, disableMin = false) {
  // Determine if optional flag should be forced
  let forceOptional = false
  if (forceOptionalFields) {
    // Remove body & query tags if other tags
    if (isIn.length > 1) {
      isIn = isIn.filter((field) => !OPTIONAL_FIELDS.includes(field))
      if (!isIn.length) isIn = OPTIONAL_FIELDS
    }
    // Force optional flag
    if (OPTIONAL_FIELDS.includes(isIn[0])) forceOptional = true
  }

  return exports.toValidationSchema(name, typeStr, limits, isIn, forceOptional, disableMin)
}


// Add additional validation to schema (overwrites matching keys)
exports.appendToSchema = function appendToSchema(schema = {}, additional = []) {
  additional.forEach(({ key, typeStr, isIn, limits }) => {
    // Check 'isIn' value
    if (!isIn) return logger.warn(`Missing "isIn" for key "${key}" from additional validator`)
    if (!Array.isArray(isIn)) isIn = [isIn]

    // If key already exists, just add missing 'in' values
    if (key in schema) return isIn.forEach((entry) => schema[key].in.includes(entry) || schema[key].in.push(entry))

    // Append to schema
    Object.entries(exports.toValidationSchema(key, typeStr, limits, isIn)).forEach(([key,val]) => schema[key] = val)
  })
  return schema
}