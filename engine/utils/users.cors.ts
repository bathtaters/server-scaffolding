import type { Cors, CorsType } from '../types/Users.d'
import RegEx, { RegExp } from '../libs/regex'
import logger from '../libs/log'
import { ExtendedType } from '../types/Model'

// Allows: String (<url>, *), URL Array, RegExp (match URL), Boolean (true/1 = all, false/0 = none)
// Stored as a STRING, retrieved as one of the above (for cors.origin)

// Compile CORS RegExps
const jsonRegex  = RegEx(/^\[.*\]$|^".*"$/)
const regExRegex = RegEx(/^RegExp\(["'](.*)["']\)\s*$/)
const commaRegex = RegEx(/\s*,\s*/)

// CORS library functions
const regEx = {
  stringify: (re: RegExp)  => `RegExp("${re.toString().slice(1, -1)}")`,
  parse:     (str: string) => {
    const match = str.match(regExRegex)
    if (match && match[1]) return RegEx(match[1])
    logger.warn(`Invalid RegExp ${str}`)
  },
  canString: (re: any):   re is RegExp => typeof re?.compile === 'function',
  canParse:  (str: any): str is `RegExp(${string})` => typeof str === 'string' && regExRegex.test(str),
}

export function isRegEx(re: any) { return re && regEx.canString(re)}


/** ExtendedType for CORS Access-Control-Allow-Origin header value */
export class CorsOrigin extends ExtendedType<string> {
  /** Default value if no value is given upon creation */
  static defaultValue: Cors = '*'

  static getType(cors: Cors): CorsType {
    if (typeof cors === 'string')  return 'string'
    if (typeof cors === 'boolean') return 'boolean'
    if (Array.isArray(cors))       return 'array'
    if (isRegEx(cors))             return 'regex'

    throw new Error(`Unexpected CORS type: "${typeof cors}" ${JSON.stringify(cors)}`)
  }
  
  /** CORS Access-Control-Allow-Origin header value */
  value: Cors     = CorsOrigin.defaultValue
  /** Type of value (string, array, boolean, regex) */
  type:  CorsType = 'string'

  constructor()
  constructor(cors: Cors)
  constructor(cors?: Cors) { super(); this._update(cors) }

  private _update(cors?: Cors, type?: CorsType) {
    if (cors == null) return this

    this.value = cors
    this.type = type == null ? CorsOrigin.getType(this.value) : type
    return this
  }

  set(cors: string)  { return this.parse(cors) }

  parse(cors?: any) {
    if (cors == null) return this // If no valid value, entry doesn't change

    if (typeof cors === 'boolean')
      return this._update(cors, 'boolean')

    if (cors === 'true' || cors === 'false')
      return this._update(cors === 'true', 'boolean')

    if (cors === '0' || cors === '1')
      return this._update(Boolean(+cors), 'boolean')

    if (typeof cors !== 'string')
      throw new Error(`Invalid CORS value <${typeof cors}>: ${JSON.stringify(cors)}`)

    if (regEx.canParse(cors))
      return this._update(regEx.parse(cors), 'regex')

    if (jsonRegex.test(cors))
      return this._update(JSON.parse(cors))

    if (cors.includes(','))
      return this._update(cors.split(',').map((c) => c.trim()), 'array')

    return cors ? this._update(cors, 'string') : this
  }

  valueOf() {
    if (this.type === 'array')   return JSON.stringify(this.value)
    if (this.type === 'regex')   return regEx.stringify(this.value as RegExp)
    if (this.type === 'boolean') return String(this.value)
    return (this.value as string).includes(',')
      ? JSON.stringify((this.value as string).split(commaRegex))
      : this.value as string
  }

  toString() {
    if (this.type === 'array') return (this.value as string[]).join(', ')
    if (this.type === 'regex') return regEx.stringify(this.value as RegExp)
    return String(this.value)
  }
}