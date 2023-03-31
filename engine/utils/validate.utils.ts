import type { Schema } from 'express-validator'
import type { Limits, BaseType, ValidationType, ValidationTypeFull } from '../types/validate.d'
import type { FormDefinition } from '../types/gui.d'
import RegEx from '../libs/regex'
import { baseTypes } from '../types/validate.d'
import { boolOptions } from '../config/validate.cfg'
import { splitUnenclosed } from './common.utils'

// *** TypeString Parse *** \\

// Initialize Parsers
const typeStrRegex = RegEx(/^([^[?*]+)(\?|\*|\[\])?(\?|\*|\[\])?(\?|\*|\[\])?$/)
const isBaseType = (str?: string): str is BaseType => !!str && Object.values<string>(baseTypes).includes(str)

/** Decode validation types to { type, hasSpaces (*), isArray ([]), isOptional (?) }. 
 * overwrite = true will overwrite exisiting type options */
export function parseTypeStr<O extends ValidationTypeFull>(options: O, overwrite = false) {
  if (!options.typeStr) return options
  
  const match = options.typeStr.toLowerCase().match(typeStrRegex)
  if (!match) throw new Error(`Unable to parse typeString: ${options.typeStr}`)

  const opts = match.slice(2,5)
  if ((overwrite || !options.type) && isBaseType(match[1])) options.type = match[1]
  if (overwrite || !options.isOptional) options.isOptional = opts.includes('?')
  if (overwrite || !options.isArray)    options.isArray    = opts.includes('[]')
  if (overwrite || !options.hasSpaces)  options.hasSpaces  = opts.includes('*')
  return options
}

/** Convert ValidationType back to typeStr */
export const toTypeString = ({ type, isOptional, isArray, hasSpaces }: ValidationType) =>
  `${type}${hasSpaces ? '*' : ''}${isArray ? '[]' : ''}${isOptional ? '?' : ''}`


// *** HTML Form validation *** \\

function generateLimits(strArray: string[]): Limits | undefined {
  if (!strArray.length) return undefined

  const sizes = strArray.map((str) => str.length)
  return { min: Math.min(...sizes), max: Math.max(...sizes) }
}


const htmlToValid = ({ type, limits }: FormDefinition['html']) => ({
  typeStr: type === 'number' ? 'int' : 'string',
  limits: !limits && Array.isArray(type) ? generateLimits(type) : limits
})


/** Get validation & limits from html object { key, type, limits } */
export const formSettingsToValidate = <S extends Record<string, FormDefinition>>(settings: S) =>
  Object.entries(settings).reduce(
    (valid, [key, { html }]) => ({ ...valid, [key]: htmlToValid(html) }),
    {} as { [N in keyof S]: ReturnType<typeof htmlToValid> }
  )


  

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
    boolTypes.includes(typeof val)


export const parseBoolean = (loose = boolOptions.loose) => !loose ?
  // Precise rules
  (val: any) => !boolOptions.false.includes(val) :
  // Loose rules
  (val: any) => typeof val === 'string' ?
    !falseBools.includes(val.toLowerCase()) :
    Boolean(val)




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
