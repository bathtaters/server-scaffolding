import type { Schema } from 'express-validator'
import type { Limit, RequestField, ValidationExpanded, ValidationOptions } from '../types/validate.d'
import { requestFields } from '../types/validate'
import logger from '../libs/log'
import { errorMsgs, dateOptions, ignoreDisableMin, defaultLimits } from "../config/validate.cfg"
import { isBoolean, parseBoolean, toTypeString, hidingMin, expandTypeStr } from '../utils/validate.utils'
import { concatUnique } from '../utils/common.utils'

// Don't allow forcing optional
const IGNORE_OPTIONAL: readonly RequestField[] = [requestFields.params] as const

/** Generate a schema object based on Types + Limits objects
 * partial = make all fields optional
 * disableMin = discard limit minimums (ie. for searching w/ partial matches) */
export const generateSchema = (
  name: string,
  options: Partial<ValidationExpanded>,
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

    if (!data.isIn.length) return logger.warn(`Missing "isIn" for "${data.key}" from additional validator`)

    if (data.key in schema)
      return schema[data.key].in = concatUnique(data.isIn, schema[data.key].in)
    
    Object.entries(toValidationSchema(data.key, expandTypeStr(data), data.isIn))
      .forEach(([key, definition]) => schema[key] = definition)
  })
  return schema
}



/** Shouldn't be called directly (exported for testing),
 *  instead use generateSchema or appendToSchema. */
export function toValidationSchema(
  key: string,
  { typeBase, isOptional, isArray, hasSpaces, limits }: Partial<ValidationExpanded>,
  isIn: RequestField[], 
  partial = false,
  disableMin = false
) {
  
  // Normalize input
  if (typeBase == null) { // Handle missing typeBase
    typeBase = 'any'
    isOptional = true
  }
  if (!isIn.length) throw new Error(errorMsgs.missingIn(key))
  if (partial && !isOptional) isOptional = true
  const type = toTypeString({ typeBase, isOptional, isArray, hasSpaces, limits })
  if (hasSpaces && typeBase !== 'string') logger.warn(`* is ignored w/ non-string type: ${type}`)

  // Initialize values for errMsg/in & ptr
  let schema: Schema = { [key]: {
    errorMessage: errorMsgs.type(type),
    in: isIn
  }}
  let ptr = schema[key]

  // Skip validation of empty strings if empty strings are allowed
  const zeroMin = typeBase === 'string' && limits && (limits.elem || limits)?.min === 0

  // Add validation for optionals/non-optionals
  if (isOptional) {
    ptr.optional = { options: { values: typeBase === 'string' && !zeroMin ? 'falsy' : 'null' } }
  } else {
    ptr.exists = { errorMessage: errorMsgs.exists() }
    ptr.optional = { options: { values: typeBase === 'string' && !zeroMin ? 'falsy' : 'undefined' } }
  }

  // Handle validation for array elements
  if (isArray) {
    // Set/Update limits
    let arrLimit: Limit | false | undefined
    if (limits && (limits.array || limits.elem)) {
      [arrLimit, limits] = [limits.array, limits.elem]
    } else {
      [arrLimit, limits] = [limits, undefined]
    }
    ptr.isArray = arrLimit === false ? { errorMessage: errorMsgs.invalid('array') } :
      { options: arrLimit || defaultLimits.array, errorMessage: errorMsgs.limit(arrLimit, 'array') }
    ptr.toArray = isOptional || undefined
    
    // Create entry & update ptr
    ptr = schema[key+'.*'] = { in: isIn, errorMessage: errorMsgs.type(typeBase) }
  }

  // Normalize and get default limits
  else if (limits && (limits.array || limits.elem)) limits = limits.elem
  if (!limits) limits = limits == null ? defaultLimits[typeBase] : undefined

  // Build options object base
  if (limits && disableMin && !ignoreDisableMin.includes(typeBase)) limits = hidingMin(limits) // Remove minimum
  const errorMessage = limits ? errorMsgs.limit(limits, typeBase) : errorMsgs.invalid(typeBase)

  // Set type-specific validators/sanitizers
  switch (typeBase) {
    case 'html':
      hasSpaces = true
      ptr.isString = { errorMessage }
    case 'b64': 
    case 'b64url':
      if (typeBase !== 'html') ptr.isBase64 = { options: { urlSafe: typeBase === 'b64url' }, errorMessage }
      // pass to string
      case 'uuid':
        if (typeBase === 'uuid') ptr.isUUID = { errorMessage }
        // pass to string
      case 'hex':
      if (typeBase === 'hex')  ptr.isHexadecimal = { errorMessage }
      // pass to string
    case 'string':
      if (typeBase === 'string') ptr.isString = { errorMessage }
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
      ptr.isISO8601 = { options: dateOptions.date, errorMessage }
      ptr.trim = true
      break
    case 'object':
      ptr.isObject = { options: { strict: true }, errorMessage }
      break
    case 'any':
    default:
      break
  }
  return schema
}
