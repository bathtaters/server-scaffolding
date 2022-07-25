const logger = require('../libs/log')
const { errorMsgs, dateOptions, ignoreDisableMin } = require("../config/validate.cfg")
const { getTypeArray, escapedLength, isBoolean, parseBoolean } = require('../utils/validate.utils')

// Obscure 'min' field (For allowing partial validation on searches) from limit
const hidingMin = ({ min, ...other }) => other

// Generate Validation Schema object based on typeString/limits/etc
function toValidationSchema(key, typeStr, limits, isIn, forceOptional = false, disableMin = false) {
  if (!isIn || !isIn.length) throw new Error(errorMsgs.missingIn(key))

  // Get type from typeStr
  const type = getTypeArray(typeStr)
  if (!type || !type[0]) throw new Error(errorMsgs.missing(key, typeStr))
  if (forceOptional) type[4] = '?'
  if (type[2] && type[1] !== 'string') logger.warn(`* is ignored w/ non-string type: ${type[0]}`)

  // Initialize ptr & static values (errMsg/in)
  let valid = { [key]: {} }
  let ptr = valid[key]
  ptr.errorMessage = errorMsgs.type(type[0])
  ptr.in = isIn

  // Add validation for optionals/non-optionals
  if (type[4]) {
    ptr.optional = { options: { nullable: true, checkFalsy: type[1] !== 'boolean' } }
  } else {
    ptr.exists = { errorMessage: errorMsgs.exists }
    
    // Skip validation of empty strings (only if empty strings are allowed)
    if (type[1] === 'string' && (!limits || (!limits.min && !limits.elem) || ((limits.elem || limits).min === 0))) {
      ptr.optional = { options: { checkFalsy: true } }
    }
  }

  // Handle validation for array elements
  if (type[3]) {
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
    ptr.errorMessage = errorMsgs.type(type[1])
    ptr.in = isIn
  }

  // Pass limits as options
  if (limits && (limits.array || limits.elem)) limits = limits.elem
  if (limits) {
    if (disableMin && !ignoreDisableMin.includes(type[1])) limits = hidingMin(limits) // Remove minimum
    limits = { options: limits, errorMessage: errorMsgs.limit(limits, type[1] === 'string') }
  }

  // Set type-specific validators/sanitizers
  switch (type[1]) {
    case 'b64': 
    case 'b64url': // pass to string
      ptr.isBase64 = { options: { urlSafe: type[1] === 'b64url' }, errorMessage: errorMsgs.b64 }
    case 'uuid': // pass to string
      if (!ptr.isBase64)
        ptr.isUUID = { options: 4, errorMessage: errorMsgs.uuid }
    case 'hex': // pass to string
      if (!ptr.isBase64 && !ptr.isUUID)
        ptr.isHexadecimal = { errorMessage: errorMsgs.hex }

    case 'string':
      ptr.isString = { errorMessage: errorMsgs.string }
      if (!type[2]) { 
        ptr.stripLow = true
        ptr.trim = true
      }
      ptr.escape = true
      if (limits) ptr.custom = escapedLength(limits)
      break
    case 'float':
      ptr.isFloat = limits || { errorMessage: errorMsgs.float }
      ptr.toFloat = true
      break
    case 'int':
      ptr.isInt = limits || { errorMessage: errorMsgs.int }
      ptr.toInt = true
      break
    case 'boolean':
      ptr.custom = { options: isBoolean(), errorMessage: errorMsgs.boolean }
      ptr.customSanitizer = { options: parseBoolean() }
      break
    case 'datetime':
      ptr.isISO8601 = { options: dateOptions.time, errorMessage: errorMsgs.datetime }
      ptr.toDate = true
      break
    case 'date':
      ptr.isDate = { options: dateOptions.date, errorMessage: errorMsgs.date }
      ptr.trim = true
      break
    case 'object': ptr.isObject = { errorMessage: errorMsgs.object } // pass to default
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

  return toValidationSchema(name, typeStr, limits, isIn, forceOptional, disableMin)
}


// Add additional validation to schema (overwrites matching keys)
exports.appendToSchema = function appendToSchema(schema = {}, additional = []) {
  additional.forEach(({ key, typeStr, isIn, limits }) => {
    // Check 'isIn' value
    if (!isIn) return logger.warn('Missing "isIn" from additional validator schema')
    if (!Array.isArray(isIn)) isIn = [isIn]

    // If key already exists, just add missing 'in' values
    if (key in schema) return isIn.forEach((entry) => schema[key].in.includes(entry) || schema[key].in.push(entry))

    // Append to schema
    Object.entries(toValidationSchema(key, typeStr, limits, isIn)).forEach(([key,val]) => schema[key] = val)
  })
  return schema
}

if (process.env.NODE_ENV === 'test') exports.toValidationSchema = toValidationSchema // export for testing ONLY