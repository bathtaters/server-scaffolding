import type { Middleware } from '../types/express.d'
import type { ObjectOf, NestedObject, NestedObjectValue } from '../types/global.d'
import RegEx, { RegExp, escapeRegexPattern } from '../libs/regex'

/** Remove hyphens & Capitalize all words (For App Title) */
export const capitalizeHyphenated = (str: string) => 
  str.replace(firstRegex, a=>a.toUpperCase()).replace(hyphenRegex, (_,g)=>' '+g.toUpperCase())

const firstRegex = RegEx(/^\w/), hyphenRegex = RegEx(/-(\w)/g)


/** Type guard for 'in' statement */
export const isIn = <T extends object>(key: any, object: T): key is keyof T => key in object

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


/** Assigns inner prop in object of objects to each outer key */
export const filterByField = <
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
  input: ObjectOf<T,K> | T[] | T,
  callback: (value: T) => Ret
): Ret | Ret[] | ObjectOf<Ret, K> {

  if (Array.isArray(input))
    return input.map((val) => deepMap(val, callback)) 
  
  if (isObj<ObjectOf<T,K>>(input))
    return Object.keys(input).reduce((obj, key) => ({
      ...obj,
      [key]: deepMap(input[key], callback),
    }), {} as ObjectOf<Ret, K>)

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
export const getMatchingKey = <O extends Record<string,any>>(object: O, propAnyCase: string) => {
  if (propAnyCase in object) return propAnyCase as keyof O

  const lowerProp = propAnyCase.toLowerCase()
  return Object.keys(object).find((p) => lowerProp === p.toLowerCase()) as keyof O | undefined
}


/** Create object w/ case insensitive keys */
export function caseInsensitiveObject<O extends Record<string,any>>(object?: O) {
  return object && new Proxy(object, {
    has(object: O, prop: string) {
      return Boolean(getMatchingKey(object, prop))
    },
    
    get(object: O, prop: string) {
      const key = getMatchingKey(object, prop)
      return key ? object[key] : undefined
    },

    set(object: O, prop: string, val: O[keyof O]) {
      const key = getMatchingKey(object, prop)
      if (!key) return false
      
      object[key] = val
      return true
    },
    
    deleteProperty(object: O, prop: string) {
      const key = getMatchingKey(object, prop)
      if (!key) return false
      
      delete object[key]
      return true
    },
  })
}