import type { Schema, Limits } from '../types/validate.d'
import type { FormDefinition } from '../types/gui.d'
import RegEx from '../libs/regex'
import { boolOptions } from '../config/validate.cfg'
import { splitUnenclosed } from './common.utils'


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

      const toArray = schema[key].toArray
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