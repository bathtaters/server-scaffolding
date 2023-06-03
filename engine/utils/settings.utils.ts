import type { DotenvParseOutput } from 'dotenv'
import type { EnvParsed, EnvObject } from '../types/settings.d'
import { definitions, escapeChars } from '../config/settings.cfg'

/** List of all keys in Settings definition */
export const settingsKeys = Object.keys(definitions) as (keyof EnvObject)[]

/** Get keys from process.env */
export const getSettingsVars = (keys: Array<keyof EnvParsed>, envObj: DotenvParseOutput) =>
  keys.reduce(
    (obj, key) => ({
      ...obj,
      [key]: key in envObj ? envObj[key] : definitions[key]?.default
    }),
    {} as EnvObject
  )

/** Convert Env object into text for .env file */
export const stringifyEnv = (envObj: EnvParsed | EnvObject) =>
  Object.entries(envObj).reduce((text, [key,val]) => `${text}${key}=${val}\n`, '')


export function filterOutProps<O extends object>(obj: O, hideProps: (keyof O)[]) {
  hideProps.forEach((prop) => { delete obj[prop] })
  return obj as Partial<O>
}

export function getChanged<T extends Record<string,any>>(base: T, update: T): Partial<T> {
  if (!base || !update) return {}
  return Object.keys(update).reduce(
    (diff, key) => base[key] === update[key] ? diff : { ...diff, [key]: base[key] },
    {}
  )
}

export function createEscapeObject(callback?: (...args: any[]) => any) {

  return function escapeObject<T extends Record<string, any>>(obj: T): Partial<T> {
    Object.entries(obj).forEach(([key,val]) => {
      const newKey = escaper(key, callback) as keyof T,
        newVal = escaper(val, callback)

      if (newKey || newVal) obj[newKey || key] = newVal || val

      if (newKey) delete obj[key]
    })
    return obj
  }
}

function escaper(input: any, callback?: (...args: any[]) => any) {
  if (typeof input !== 'string') return

  return escapeChars.reduce(
    (escaped, { find, repl }) => {

      const text = escaped || input
      if (!find.test(text)) return escaped

      if (!callback) return text.replace(find, repl).trim()

      return text.replace(find, (...args) => callback(...args) ?? repl).trim()
    }, ''
  )
}