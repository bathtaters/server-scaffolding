import type { Cors } from '../types/Users.d'
import RegEx, { RegExp } from '../libs/regex'
import logger from '../libs/log'

// Allows: String (<url>, *), URL Array, RegExp (match URL), Boolean (true/1 = all, false/0 = none)
// Stored as a STRING, retrieved as one of the above (for cors.origin)

// Compile CORS RegExps
const jsonRegex  = RegEx(/^\[.*\]$|^".*"$/)
const regExRegex = RegEx(/^RegExp\(["'](.*)["']\)\s*$/)
const commaRegex = RegEx(/\s*,\s*/)

// CORS library
const regEx = {
  stringify: (re: RegExp)  => `RegExp("${re.toString().slice(1, -1)}")`,
  parse:     (str: string) => {
    const match = str.match(regExRegex)
    if (match && match[1]) return RegEx(match[1])
    logger.warn(`Invalid RegExp ${str}`)
  },
  canString: (re: any):   re is RegExp => typeof re?.compile === 'function',
  canParse:  (str: any): str is string => typeof str === 'string' && regExRegex.test(str),
}

export function decodeCors(cors?: Cors): Cors | undefined {
  if (cors == null) return undefined
  if (cors === 'true' || cors === 'false') return cors === 'true'
  if (cors === '0' || cors === '1') return Boolean(+cors)
  if (regEx.canParse(cors)) return regEx.parse(cors)
  return typeof cors === 'string' && jsonRegex.test(cors) ? JSON.parse(cors) : cors
}

export function encodeCors(cors?: Cors | number) {
  if (cors == null) return undefined
  if (Array.isArray(cors)) return JSON.stringify(cors)
  if (regEx.canString(cors)) return regEx.stringify(cors)
  if (typeof cors === 'number' || cors === '0' || cors === '1') cors = Boolean(+cors)
  if (typeof cors === 'boolean') return String(cors)
  if (typeof cors ==='string' && cors.includes(',')) return JSON.stringify(cors.split(commaRegex))
  return cors as string
}

export function displayCors(cors?: Cors) {
  if (cors == null) return undefined
  if (Array.isArray(cors)) return cors.join(', ')
  if (regEx.canString(cors)) return regEx.stringify(cors)
  return String(cors)
}

export function isRegEx(re: any) { return re && regEx.canString(re)}