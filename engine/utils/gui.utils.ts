import type { Recur } from '../types/global.d'
import RegEx from '../libs/regex'
import { isDate } from '../libs/date'
import { guiCfg } from '../src.import'
import { mapObject } from './common.utils'
const { varNameDict, MASK_CHAR } = guiCfg

const capitalRegex = RegEx(/([A-Z])/g), firstRegex = RegEx(/^./)
export const varName = (str: string): string =>
  str in varNameDict    ? varNameDict[str] :
  str.charAt(0) === '_' ? varName(str.slice(1)) :
  str.replace(capitalRegex, ' $1').replace(firstRegex, (ltr) => ltr.toUpperCase())
  

/** Get KEYS from schema */
export const getTableFields = <T extends Record<string,any>>(schema: T, idKey: string) => {
  let keys = Object.keys(schema)

  // Move ID to start
  const idIdx = keys.map((k) => k.toLowerCase()).indexOf(idKey.toLowerCase())
  if (idIdx > 0) keys.unshift(keys.splice(idIdx,1)[0])

  const fields = mapObject(schema, (_,key) => varName(key as string))
  return fields
}


/** Default 'formatData' callback for GUI */
export function formatGuiData(data?: any) {
  if (Array.isArray(data)) return data.map((row) => mapObject(row, toGuiString))
  if (data && typeof data === 'object') return mapObject(data, toGuiString)
}

const toGuiString = (val: any): string => {
  if (typeof val === 'string') return val

  if (Array.isArray(val)) return val.map(toGuiString).join(', ')

  if (!val || typeof val.toLocaleString !== 'function') return String(val)
  
  const str = val.toLocaleString()
  return str === '[object Object]' ? JSON.stringify(val) : str
}


export function mask <T = any>(value: T): Recur<T, string> {
  // Recursively mask
  if (Array.isArray(value))
    return value.map(mask) as Recur<T, string>
  if (value && typeof value === 'object')
    return Object.entries(value).reduce(
      (obj,[key,val]) => ({ ...obj, [key]: mask(val) }),
      {}) as Recur<T, string>

  // Mask literals
  switch (typeof value) {
    // Type name
    case 'boolean':
    case 'function':
    case 'symbol':
      return `[${typeof value}]` as Recur<T, string>
    
    // Repeating char
    case 'number':
    case 'bigint':
      return MASK_CHAR.repeat(value.toString().length) as Recur<T, string>
    case 'string':
      return MASK_CHAR.repeat(value.length) as Recur<T, string>
  }

  // Don't mask anything else (null/undef)
  return String(value) as Recur<T, string>
}
