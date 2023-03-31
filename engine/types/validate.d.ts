import { RequireOne } from "./global"

export const baseTypes = {
    string:   "string",
    uuid:     "uuid",
    b64:      "b64",
    b64url:   "b64url",
    hex:      "hex",
    date:     "date",
    datetime: "datetime",
    boolean:  "boolean",
    int:      "int",
    float:    "float",
    object:   "object",
    any:      "any",
} as const

export const typeSuffixes = {
    isOptional: "?",
    isArray:    "[]",
    hasSpaces:  "*",
} as const

export const requestFields = {
    body:    "body",
    cookies: "cookies",
    headers: "headers",
    query:   "query",
    params:  "params",
} as const


/** Validation type of form: type*[]? (All suffixes are optional)
 *   - type = string, uuid, b64[url], hex, date, datetime, boolean, int, float, object, any
 *   - [] = array of type
 *   - ? = column is optional
 *   - \* = (Only allowed w/ type = string) allows symbols/spaces in string */
export type ValidationString =  `${
    BaseType | `${typeof baseTypes.string}${typeof typeSuffixes.hasSpaces}` /* string* */
}${
    /* [], ? or []? */
    "" | Exclude<TypeSuffix, typeof typeSuffixes.hasSpaces> | `${typeof typeSuffixes.isArray}${typeof typeSuffixes.isOptional}`
}`


export type ValidationType = {
    /** Base type (No *[]? suffixes)
     *   - Defintion MUST include a type or a typeStr
     *   - default: parsed from typeStr */
    type:        BaseType,
    
    /** Limit object
     *   - { min?, max? } | { array: { min?, max? }, elem: { min?, max? } }
     *   - undefined = default limits; false = no limits
     *   - Sets limits on numbers, string length or array size */
    limits?:      LimitsFalsable,

    /** Value can be undefined ('?' suffix)
     *   - default: parsed from typeStr */
    isOptional?:  boolean,

    /** If column is an array of <type> ('[]' suffix)
     *   - This will auto-create and link a related table for this column
     *      unless "db" property is present
     *   - default: parsed from typeStr */
    isArray?:     boolean,

    /** If a string column will allow spaces & special characters ('*' suffix)
     *   - default: parsed from typeStr */
    hasSpaces?:   boolean,
}

export type ValidationTypeFull = RequireOne<Partial<ValidationType> & {
    /** Validation type of form: type*[]? (All suffixes are optional)
    *   - type = string, uuid, b64[url], hex, date, datetime, boolean, int, float, object, any
    *   - [] = array of type
    *   - ? = column is optional
    *   - \* = (Only allowed w/ type = string) allows symbols/spaces in string */
    typeStr?: ValidationString
}, 'type'|'typeStr'>

export type ValidationOptions = ValidationTypeFull & { key: string, isIn: RequestField[]}

export type BaseType = typeof baseTypes[keyof typeof baseTypes]
export type TypeSuffix = typeof typeSuffixes[keyof typeof typeSuffixes]
export type RequestField = typeof requestFields[keyof typeof requestFields]

type Limit = { min?: number, max?: number }
export type Limits = Limit & { elem?: Limit, array?: Limit }
export type LimitsFalsable = (Limit & { elem?: Limit | false, array?: Limit | false }) | false

export type TypeDef = BaseType | "array"

const T = typeof 0
export type TypeOf = typeof T