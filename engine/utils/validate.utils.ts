import type { Schema } from 'express-validator'
import type { Limits, ValidationExpanded, ValidationBasic, ValidationBase, ValidationType, Interval } from '../types/validate.d'
import { baseTypes, intervalKeys, typeSuffixes } from '../types/validate'
import RegEx from '../libs/regex'
import { isDate } from '../libs/date'
import { splitUnenclosed } from './common.utils'
import { boolOptions } from '../config/validate.cfg'

// *** TypeString Parse *** \\

// Initialize Parsers
const typeStrRegex = RegEx(/^([^[?*]+)(\?|\*|\[\??\])?(\?|\*|\[\??\])?(\?|\*|\[\??\])?$/)
const isBaseType = (str?: string): str is ValidationBase => !!str && Object.values<string>(baseTypes).includes(str)

/** Decode validation types to { type, hasSpaces (*), isArray ([]), isOptional (?) }. 
 * overwrite = true will overwrite exisiting type options */
export function expandTypeStr({ type, limits }: ValidationBasic): ValidationExpanded {  
  const match = type.toLowerCase().match(typeStrRegex)

  if (!match) throw new Error(`Unable to parse typeString: ${type}`)
  if (!isBaseType(match[1])) throw new Error(`TypeString "${type}" is not one of: ${Object.values(baseTypes).join(', ')}`)

  const opts = match.slice(2,5)
  return {
    typeBase: match[1],
    limits,
    isOptional : opts.includes(typeSuffixes.isOptional),
    isArray    : opts.includes(typeSuffixes.isOptArray) ? '?' : opts.includes(typeSuffixes.isArray),
    hasSpaces  : opts.includes(typeSuffixes.hasSpaces),
  }
}

/** Convert ValidationType back to ValidationBasic.type */
export const toTypeString = ({ typeBase, isOptional, isArray, hasSpaces }: ValidationExpanded) =>
  `${typeBase}${
    hasSpaces  ? typeSuffixes.hasSpaces  : ''}${
    isArray === '?' ? typeSuffixes.isOptArray : isArray ? typeSuffixes.isOptional : ''}${
    isOptional ? typeSuffixes.isOptional : ''
  }` as ValidationType


/** Generate validation limits based on a pre-defined array of possible strings */
export function generateLimits(strArray: string[]): Limits | undefined {
  if (!strArray.length) return undefined

  const sizes = strArray.map((str) => str.length)
  return { min: Math.min(...sizes), max: Math.max(...sizes) }
}



// *** Date validation *** \\

export function parseDate(date: any) {
  if (typeof date === 'number') return date
  if (!date)        return null
  if (isDate(date)) return date.getTime()
  if (!isNaN(date)) return +date
  /* Fallback */    return new Date(date).getTime()
}



// *** Boolean validation *** \\
  
const extractStrings = (array: readonly any[]) => array.filter((val) => typeof val === 'string') as string[]
const allBools    = [ ...boolOptions.true, ...boolOptions.false ]
const boolStrings = extractStrings(allBools).map((val) => val.toLowerCase())
const falseBools  = extractStrings(boolOptions.false).map((val) => val.toLowerCase())
const boolTypes   = boolOptions.types.filter((val) => val !== 'string')


export const isBoolean = (loose = boolOptions.loose) => !loose ?
  // Precise rules
  (val: any) => allBools.includes(val) :
  // Loose rules
  (val: any) => typeof val === 'string' ?
    boolStrings.includes(val.toLowerCase()) :
    (boolTypes as string[]).includes(typeof val)


export const parseBoolean = (loose = boolOptions.loose) => !loose ?
  // Precise rules
  (val: any) => !boolOptions.false.includes(val) :
  // Loose rules
  (val: any) => typeof val === 'string' ?
    !falseBools.includes(val.toLowerCase()) :
    Boolean(val)



// *** Interval Validation *** \\

// Setup custom validator/sanitizer for intervals
export const customInterval = {
  validate: (value: unknown) => {
    if (typeof value !== "object" || !value) return false
    return intervalKeys.every((key) => isDigitOrNull((value as any)[key]))
  },
  sanitize: {
    options: (value: any) => {
      const result: Interval = { toPostgres: function() { return intervalString(this) } }
      intervalKeys.forEach((key) => {
        if (value[key] || value[key] === 0)
          result[key] = Number(value[key])
      })
      return result
    }
  },
}
const isDigitOrNull = (value: unknown) => typeof value === "number" ? true : value == null ? true :
  typeof value === "string" ? /^\d*$/.test(value) : false

/** Convert a standard interval object into a postgres string */
export const intervalString = (interval: Interval) => {
  let result = ""
  for (const key of intervalKeys) {
    if (typeof interval[key] === "number")
      result += ` ${interval[key]} ${interval[key] === 1 ? key.slice(0, -1) : key}`
  }
  return result.slice(1)
}

const isIntervalKey = (key: any): key is typeof intervalKeys[number] => intervalKeys.includes(key)

/** Convert a postgres string into a standard interval object */
export const intervalObj = (intervalStr: string) => {
  let result: Interval = { toPostgres: function() { return intervalString(this) } }

  const splitStr = intervalStr.split(RegEx(/\s+/))
  for (let i = 0; i < splitStr.length; i += 2) {
    
    const count = parseFloat(splitStr[i])
    const key = splitStr[i + 1].endsWith('s') ? splitStr[i + 1] : `${splitStr[i + 1]}s`
    
    if (isNaN(count) || !isFinite(count) || !isIntervalKey(key))
      throw new Error(`Invalid Interval string: '${intervalStr}' [${key}]`)
    
    result[key] = count
  }
  return result
}



// *** Array Validation *** \\

const arrJson = RegEx(/^\[.*\]$/)
const splitter = splitUnenclosed(',', { trim: true, enclosures: ['{}','[]','""',"''"] })


export const parseArray = (optional = true) => optional ?
  // OPTIONAL
  <T>(val?: T[] | T | string | null) => {
    if(Array.isArray(val)) return val
    if(typeof val !== 'string' || !val) return undefined
    return splitter(arrJson.test(val) ? val.slice(1,val.length-1) : val)
  }
  :
  // NON-OPTIONAL
  <T>(val?: T[] | T | string | null) => {
    if(Array.isArray(val)) return val
    if(val == null || val === '') return [] 
    if(typeof val !== 'string') return [val]
    return splitter(arrJson.test(val) ? val.slice(1,val.length-1) : val) ?? []
  }


export function toArraySchema(schema: Schema) {
  return Object.keys(schema).reduce(
    (arrSchema, key) => {
      if (!('toArray' in schema[key])) return arrSchema

      const toArray = Boolean(schema[key].toArray)
      delete schema[key].toArray

      return {
        ...arrSchema,

        [key]: {
          in: schema[key].in,
          customSanitizer: {
            options: parseArray(toArray)
          },
          optional: !toArray ? undefined : {
            options: { nullable: true, checkFalsy: true }
          }
        }
      }
    },
    {} as Schema
  )
}


// *** Simple Helpers *** \\

export const hidingMin = <T extends { min?: any }>({ min, ...other }: T) => other
