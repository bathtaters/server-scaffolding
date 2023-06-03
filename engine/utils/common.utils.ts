import type { ObjectOf, NestedObject } from '../types/global.d'
import type { Middleware } from '../types/express.d'
import RegEx, { RegExp, escapeRegexPattern } from '../libs/regex'

/** Remove hyphens & Capitalize all words (For App Title) */
export const capitalizeHyphenated = (str: string) => 
  str.replace(firstRegex, a=>a.toUpperCase()).replace(hyphenRegex, (_,g)=>' '+g.toUpperCase())

const firstRegex = RegEx(/^\w/), hyphenRegex = RegEx(/-(\w)/g)

/** Escape all RegEx special characters in a string */
export const escapeRegEx = (str: string) => str.replace(escAllPattern, '\\$&')
const escAllPattern = RegEx(/[.*+?^${}()|[\]\\]/, 'g')

/** Type guard for 'in' statement */
export const isIn = <T extends object>(key: any, object: T): key is keyof T => key in object

/** Type guard for object key accessor */
export const getVal = <T extends object>(object: T, key: keyof any): T[keyof T] | undefined => (object as any)[key]

/** Type guard for non-array/null objects */
export const isObject = (obj: any): obj is Record<string,any> => typeof obj === 'object' && obj !== null && !Array.isArray(obj)

/** Return number of 'def' value/0 if it is not a number */
export const toNumber = (val: any, def = 0) => typeof val === 'number' ? val : def

/** Filter out duplicate values from array */
export const filterDupes = <T = any>(arr: T[]) => 
arr.filter((val, idx) => !arr.slice(0,idx).includes(val))

/** Concatenate value(s) to array as long as they don't already exist.
 * This will not check the input values for uniqueness w/in themselves. */
export const concatUnique = <T = any, S = T>(arr1: T[], arr2?: S | S[]) => {
  if (arr2 == null) return [ ...arr1 ]
  if (!Array.isArray(arr2)) arr2 = [arr2]
  return [ ...arr1, ...arr2.filter((item) => !arr1.includes(item as any)) ]
}

/** Check if array has any duplicate values (Returning 1-based index of 1st match) */
export const hasDupes = <T = any>(array: T[]) =>
  array.findIndex((val, idx) => array.slice(0, idx).includes(val)) + 1

/** Array.Map() method for an Object, Maps values to new values, return a new object */
export const mapObject = <T extends Record<any,any>, R>(object: T, callback: (value: T[keyof T], key: keyof T) => R) =>
  Object.entries(object).reduce(
    (result, [key, value]) => ({ ...result, [key]: callback(value, key) }),
    {} as Record<keyof T, R>,
  )


/** Assigns inner prop in object of objects to each outer key */
export const mapToField = <
  O extends NestedObject<Record<string,any>,any> = NestedObject<Record<string,any>,any>,
  F extends keyof O[keyof O] & string = keyof O[keyof O] & string
>
  (obj: O, field: F) => Object.entries(obj).reduce<Partial<{ [P in keyof O & string]: O[P][F] }>>(
    (res, [key, val]) =>
      val[field] == null || typeof key !== 'string' ? res : { ...res, [key]: val[field] },
    {}
  )


/** Flips keys and values of object */
export const invertObject = <O extends Record<string | number | symbol, string | number | symbol>>
  (obj: O) => Object.entries(obj).reduce(
    (inv, [key, val]) => ({ ...inv, [val]: key }),
    {} as { [K in keyof O as O[K]]: K }
  )


/** Get all routes except given route */
export function exceptRoute(skipPath: string, middleware: Middleware): Middleware;
export function exceptRoute(skipPath: string, middleware: Middleware[]): Middleware[];
export function exceptRoute(skipPath: string, middleware: Middleware | Middleware[]): Middleware | Middleware[] {
  if (Array.isArray(middleware)) return middleware.map((mw) => exceptRoute(skipPath,mw))
  return (req,res,next) => RegEx(`^${skipPath}`,'i').test(req.path) ? next() : middleware(req,res,next)
}


/** Run callback on each item & replace with result */
export function deepMap<T = any, Ret = any>(input: T, callback: (value: T) => Ret): Ret;
export function deepMap<T = any, Ret = any>(input: T[], callback: (value: T) => Ret): Ret[];
export function deepMap<T = any, Ret = any, K extends keyof T = keyof T>(input: ObjectOf<T>, callback: (value: T) => Ret): ObjectOf<Ret, K>;
export function deepMap<T = any, Ret = any, K extends keyof T = keyof T>(
  input: Record<K,T> | T[] | T,
  callback: (value: T) => Ret
): Ret | Ret[] | Record<K, Ret> {

  if (Array.isArray(input))
    return input.map((val) => deepMap(val, callback)) 
  
  if (isObj<Record<K,T>>(input))
    return mapObject(input, (val) => deepMap(val, callback))

  return callback(input)
}
const isObj = <T>(obj: any): obj is T => typeof obj === 'object' && obj


/** Check deep equality */
export const deepEquals = <T>(a: T, b: T, compareFunc = (a: T, b: T) => a === b): boolean => {
  if (compareFunc(a, b)) return true
  if (typeof a !== 'object') return false
  if (!a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false

  const keys = Object.keys(a) as (keyof T)[],
    bKeys = Object.keys(b) as (keyof T)[]
  if (keys.length !== bKeys.length || !bKeys.every((key) => keys.includes(key))) return false
  return keys.every((key) => deepEquals(a[key], b[key]))
}


/** Advanced string splitter (Returns split function from options), enclosures should be open/close char for each enclosure */
export const splitUnenclosed = (splitDelimiter: string | RegExp, { trim = true, escape = '\\', enclosures = ['()','{}','""',"''",'[]','<>'] } = {}) => {
  const delimRegex = RegEx(`^${escapeRegexPattern(splitDelimiter)}`)
  
  const [ open, close ] = enclosures.reduce<string[]>(
    (arrs, item) => arrs.map((val,i) => val + item.charAt(i)),
    ['','']
  )

  const updateCounter = (char: string, counter: number[]) => {
    let i = -1
    if      ((i =  open.indexOf(char)) !== -1)               ++counter[i]
    else if ((i = close.indexOf(char)) !== -1 && counter[i]) --counter[i]
  }
  
  const appendStr = trim ?
    ((next: string, array: string[]) => (next = next.trim()) ? array.concat(next) : array) :
    ((next: string, array: string[]) =>  next                ? array.concat(next) : array)

  
  return (text?: string) => {
    if (typeof text !== 'string') return text

    let array: string[] = [], next = '', counter = enclosures.map(() => 0)

    for (let match: RegExpMatchArray | null; text; text = text.slice(1)) {

      if ((match = text.match(delimRegex)) && !Object.values(counter).some((n) => n)) {
        if (match[0].length > 1) text = text.slice(match[0].length - 1)
        array = appendStr(next, array)
        next = ''

      } else if (text.charAt(0) === escape) {
        next += text.charAt(1)
        text = text.slice(1)

      } else {
        updateCounter(text.charAt(0), counter)
        next += text.charAt(0)
      }
    }

    return appendStr(next, array)
  }
}


/** Get debounced version of func & func to force next call to use original func */
export function debounce<Args extends any[], Ret>(
  func: (...args: Args) => Ret,
  { interval = 1000, ignoreArgs = false } = {}): [(...args: Args) => Ret, () => void]
{
  
  if (!interval) return [ func, () => {} ]

  let resultargs: Args, result: typeof EMPTY | Ret = EMPTY

  const forceNextCall = () => { result = EMPTY }

  return [
    function debouncedFunc(...args: Args) {
      if (result !== EMPTY && (ignoreArgs || deepEquals(args, resultargs))) return result
      
      const newResult = result = func(...args)
      if (!ignoreArgs) resultargs = args

      if (interval > 0) setTimeout(forceNextCall, interval)
      return newResult
    },
    forceNextCall,
  ]
}
const EMPTY = Symbol('EMPTY')


/** Get throttled version of func w/ 1 argument */
export function throttle<Arg, Ret>(func: (args: Arg[]) => Ret, interval: number, callback?: (result: Ret) => any) {
	let timer: NodeJS.Timeout, calls: Arg[] = []

	return function throttledCall(arg: Arg) {
		calls = calls.concat(arg)

		if (timer) clearTimeout(timer)

		timer = setTimeout(() => {
			const args = calls
      calls = []
			const result = func(args)
			callback && callback(result)
		}, interval)
	}
}


/** Get object key case-insensitive */
export const getMatchingKey = <O extends Record<string,any>>(object: O, keyAnyCase: string) => {
  if (keyAnyCase in object) return keyAnyCase as keyof O

  const lowerProp = keyAnyCase.toLowerCase()
  return Object.keys(object).find((p) => lowerProp === p.toLowerCase()) as keyof O | undefined
}

/** Get value of object key case-insensitive */
export const getMatchingValue = <O extends Record<string,any>>(object: O, keyAnyCase: string) => {
  const key = getMatchingKey(object, keyAnyCase)
  return key && object[key]
}

/** Return value of object key case-insensitive, removing it from the object */
export const extractValue = <O extends Record<string|number,any>>(object: O, keyAnyCase: string) => {
  const key = getMatchingKey(object, keyAnyCase)
  if (!key) return undefined

  const value = object[key]
  delete object[key]
  return value
}


/** Iterate through object, copying each key in allowedKeys to a new object
 * @param obj - Object to sanitize
 * @param allowedKeys - (Default: all keys) List of keys to include in copy
 * @param recursive - (Default: true) Recursively sanitize inner arrays/objects using same allowedKeys
 * @returns Sanitized copy of the object */
export function sanitizeObject<T extends object>(obj: T, allowedKeys?: (keyof T)[], recursive = true): T {
  return (allowedKeys || Object.keys(obj) as (keyof T)[]).reduce(
    (sanit, key) => {
      if (!(key in obj))           return sanit
      if (!recursive || !obj[key]) return { ...sanit, [key]: obj[key] }

      if (Array.isArray(obj[key]))      return {
        ...sanit,
        [key]: (obj[key] as any[]).map((o) => isObject(o) ? sanitizeObject(o as T, allowedKeys, recursive) : o)
      }
      return {
        ...sanit,
        [key]: isObject(obj[key]) ? sanitizeObject(obj[key] as T, allowedKeys, recursive) : obj[key]
      }
    },
    {} as T
  )
}


/** Create a function that will normalizing the case of an object's keys based off the keyObj
 * @param keyObj - Example object with correct case keys
 * @returns Function that will create a copy of an object similar to keyObj, normalizing the case of the keys */
export function createCaseInsensitiveCopier<B extends Record<string,any>>(keyObj: B) {
  const keyList = Object.keys(keyObj)

  /** Copy an object, normalizing the case of its keys
   * @param obj - Object w/ any case keys
   * @returns Copy of object w/ correct case keys */
  return function caseInsenitiveCopy<T extends Record<keyof B & string, any>>(obj: T): T {
    return keyList.reduce((copy, key) => {
      const objKey = getMatchingKey(obj, key)
      return objKey === undefined ? copy : { ...copy, [key]: obj[objKey] }
    },
    {} as T)
  }
}