const logger = require('../config/log.adapter')
const validCfg = require('../config/constants/validation.cfg')
const errorText = require("../config/constants/validate.messages")
const { getTypeArray, dateOptions, escapedLength } = require('../utils/validate.utils')
const errors = require('../config/constants/error.messages')

// Generate Schema object based on input
function getSchema(key, typeStr, limits, isIn, forceOptional = false) {
  if (!isIn || !isIn.length) throw errors.internalValidate(errorText.missingIn(key))

  // Get type from typeStr
  const type = getTypeArray(typeStr)
  if (!type || !type[0]) throw errors.internalValidate(errorText.missing(key, typeStr))
  if (forceOptional) type[4] = '?'
  if (type[2] && type[1] !== 'string') logger.warn('* is ignored w/ non-string type: ', type[0])

  // Initialize ptr & static values (errMsg/in)
  let valid = { [key]: {} }
  let ptr = valid[key]
  ptr.errorMessage = errorText.type(type[0])
  ptr.in = isIn

  // Add validation for optionals/non-optionals
  if (type[4]) {
    ptr.optional = { options: { nullable: true, checkFalsy: type[1] !== 'boolean' } }
  } else {
    ptr.exists = { errorMessage: errorText.exists }
    
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
    ptr.isArray = { options: arrLimit, errorMessage: errorText.limit(arrLimit || 'array') }
    
    // Create entry & update ptr
    valid[key+'.*'] = {}
    ptr = valid[key+'.*']

    // Set statics for new entry
    ptr.errorMessage = errorText.type(type[1])
    ptr.in = isIn
  }

  // Pass limits as options
  if (limits && (limits.array || limits.elem)) limits = limits.elem
  if (limits) limits = { options: limits, errorMessage: errorText.limit(limits, type[1] === 'string') }

  // Set type-specific validators/sanitizers
  switch (type[1]) {
    case 'b64': 
    case 'b64url': // pass to string
      ptr.isBase64 = { options: { urlSafe: type[1] === 'b64url' }, errorMessage: errorText.b64 }
    case 'uuid': // pass to string
      if (!ptr.isBase64)
        ptr.isUUID = { options: 4, errorMessage: errorText.uuid }
    case 'hex': // pass to string
      if (!ptr.isBase64 && !ptr.isUUID)
        ptr.isHexadecimal = { errorMessage: errorText.hex }

    case 'string':
      ptr.isString = { errorMessage: errorText.string }
      if (!type[2]) { 
        ptr.stripLow = true
        ptr.trim = true
      }
      ptr.escape = true
      if (limits) ptr.custom = escapedLength(limits)
      break
    case 'float':
      ptr.isFloat = limits || { errorMessage: errorText.float }
      ptr.toFloat = true
      break
    case 'int':
      ptr.isInt = limits || { errorMessage: errorText.int }
      ptr.toInt = true
      break
    case 'boolean':
      ptr.isBoolean = { errorMessage: errorText.boolean }
      ptr.toBoolean = true
      break
    case 'datetime':
      ptr.isISO8601 = { options: dateOptions.time, errorMessage: errorText.datetime }
      ptr.toDate = true
      break
    case 'date':
      ptr.isDate = { options: dateOptions.date, errorMessage: errorText.date }
      ptr.trim = true
      break
    case 'object': ptr.isObject = { errorMessage: errorText.object } // pass to default
    case 'any':  // pass to default
    default: break
  }

  return valid
}


// Generate schema object based on ValidCfg file
function getSchemaFromCfg(set, key, isIn = ['params'], optionalIfOnlyBody = false) {
  // Determine if optional flag should be forced
  let forceOptional = false
  if (optionalIfOnlyBody) {
    // Remove body tag if other tags
    if (isIn.length > 1) isIn = isIn.filter(t => t !== 'body')
    // Otherwise force optional flag
    else if (isIn[0] === 'body') forceOptional = true
  }

  return exports.getSchema(key, validCfg.types[set][key], validCfg.limits[set][key], isIn, forceOptional)
}

exports.getSchema = getSchema
exports.getSchemaFromCfg = getSchemaFromCfg