import type { EnvSettings, EnvObject } from '../types/process.d'
import { definitions, escapeChars } from '../config/settings.cfg'

/** Get keys from process.env */
export const getSettingsVars = (keys: Array<keyof EnvSettings>, envObj: EnvObject = process.env) =>
  keys.reduce(
    (obj, key) => ({
      ...obj,
      [key]: key in envObj ? envObj[key] : definitions[key]?.default
    }),
    {} as EnvObject
  )

/** Convert Env object into text for .env file */
export const stringifyEnv = (envObj: EnvSettings | EnvObject) =>
  Object.entries(envObj).reduce((text, [key,val]) => `${text}${key}=${val}\n`, '')


export function filterOutProps<O extends object, P extends keyof O>(obj: O, hideProps: P[]) {
  hideProps.forEach((prop) => { delete obj[prop] })
  return obj as Omit<O, P>
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