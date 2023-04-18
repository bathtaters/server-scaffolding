import type { Schema } from 'express-validator'
import type { Limit, RequestField, ValidationType, ValidationOptions } from '../types/validate.d'
import { requestFields } from '../types/validate'
import logger from '../libs/log'
import { errorMsgs, dateOptions, ignoreDisableMin, defaultLimits } from "../config/validate.cfg"
import { isBoolean, parseBoolean, toTypeString, hidingMin, parseTypeStr } from '../utils/validate.utils'
import { concatUnique } from '../utils/common.utils'

// Don't allow forcing optional
const IGNORE_OPTIONAL: readonly RequestField[] = [requestFields.params] as const

/** Generate a schema object based on Types + Limits objects
 * partial = make all fields optional
 * disableMin = discard limit minimums (ie. for searching w/ partial matches) */
export const generateSchema = (
  name: string,
  options: ValidationType,
  isIn: RequestField[] = [requestFields.params],
  partial = false,
  disableMin = false,
) => toValidationSchema(
  name, options, isIn,
  partial && !isIn.some((key) => IGNORE_OPTIONAL.includes(key)),
  disableMin,
)


/** Add additional validation into schema (appending isIn values to already exisiting keys) */
export function appendToSchema(schema: Schema = {}, additional: readonly ValidationOptions[] = []) {
  additional.forEach((data) => {

    if (!data.isIn) return logger.warn(`Missing "isIn" for "${data.key}" from additional validator`)
    if (!Array.isArray(data.isIn)) data.isIn = [data.isIn]

    if (data.key in schema)
      return schema[data.key].in = concatUnique(data.isIn, schema[data.key].in)

    parseTypeStr(data)
    if (!data.type) return logger.warn(`Missing "typeStr" and "type" from "${data.key}" (Must include at least one)`)
    
    Object.entries(toValidationSchema(data.key, data as ValidationType, data.isIn))
      .forEach(([key, definition]) => schema[key] = definition)
  })
  return schema
}



/** Shouldn't be called directly (exported for testing),
 *  instead use generateSchema or appendToSchema. */
export function toValidationSchema(
  key: string,
  options: ValidationType,
  isIn: RequestField[], 
  partial = false,
  disableMin = false
) {

  let { type, isOptional, isArray, hasSpaces, limits } = options
  if (!isIn || !isIn.length) throw new Error(errorMsgs.missingIn(key))

  // Get type from typeStr
  if (!type) throw new Error(errorMsgs.missing(key, toTypeString(options)))
  if (partial && !isOptional) isOptional = true
  if (hasSpaces && type !== 'string') logger.warn(`* is ignored w/ non-string type: ${toTypeString(options)}`)

  // Initialize static values (errMsg/in) & ptr
  let schema: Schema = { [key]: {
    errorMessage: errorMsgs.type(toTypeString(options)),
    in: isIn
  }}
  let ptr = schema[key]

  // Add validation for optionals/non-optionals
  if (isOptional) {
    ptr.optional = { options: { nullable: true, checkFalsy: type !== 'boolean' } }
  } else {
    ptr.exists = { errorMessage: errorMsgs.exists() }
  }

  // Handle validation for array elements
  if (isArray) {
    // Set/Update limits
    let arrLimit: Limit | false | undefined;
    [ arrLimit, limits ] = limits && (limits.array || limits.elem) ? [ limits.array, limits.elem ] : [ limits ]
    
    ptr.isArray = arrLimit === false ? { errorMessage: errorMsgs.invalid('array') } :
      { options: arrLimit || defaultLimits.array, errorMessage: errorMsgs.limit(arrLimit, 'array') }
    ptr.toArray = isOptional || undefined
    
    // Create entry & update ptr
    ptr = schema[key+'.*'] = { in: isIn, errorMessage: errorMsgs.type(type) }
  }

  // Normalize and get default limits
  else if (limits && (limits.array || limits.elem)) limits = limits.elem
  if (!limits) limits = limits == null ? defaultLimits[type] : undefined

  // Allow empty strings (only if string minimum is >= 0)
  if (!isOptional && !isArray && type === 'string' && (!limits || !limits.min))
    schema[key].optional = { options: { checkFalsy: true } }

  // Build options object base
  if (limits && disableMin && !ignoreDisableMin.includes(type)) limits = hidingMin(limits) // Remove minimum
  const errorMessage = limits ? errorMsgs.limit(limits, type) : errorMsgs.invalid(type)

  // Set type-specific validators/sanitizers
  switch (type) {
    case 'b64': 
    case 'b64url':
      ptr.isBase64 = { options: { urlSafe: type === 'b64url' }, errorMessage }
      // pass to string
    case 'uuid':
    case 'hex':
      if (type === 'uuid') ptr.isUUID = { errorMessage }
      if (type === 'hex')  ptr.isHexadecimal = { errorMessage }
      // pass to string
    case 'string':
      if (type === 'string') ptr.isString = { errorMessage }
      if (limits) ptr.isLength = { options: limits, errorMessage }
      if (!hasSpaces) { 
        ptr.stripLow = true
        ptr.trim = true
      }
      break
    case 'float':
      ptr.isFloat = { options: limits, errorMessage }
      ptr.toFloat = true
      break
    case 'int':
      ptr.isInt = { options: limits, errorMessage }
      ptr.toInt = true
      break
    case 'boolean':
      ptr.custom = { options: isBoolean(), errorMessage }
      ptr.customSanitizer = { options: parseBoolean() }
      break
    case 'datetime':
      ptr.isISO8601 = { options: dateOptions.time, errorMessage }
      ptr.toDate = true
      break
    case 'date':
      ptr.isDate = { options: dateOptions.date, errorMessage }
      ptr.trim = true
      break
    case 'object': ptr.isJSON = { options: { allow_primitives: false }, errorMessage }
    case 'any':  // pass to default
    default: break
  }
  return schema
}
