import type { baseTypes, typeSuffixes, requestFields } from "./validate"
import type { OneOrMore } from "./global.d"

/** Validation type of form: type*[]? (All suffixes are optional)
 *   - type = string, uuid, b64[url], hex, date, datetime, boolean, int, float, object, any
 *   - [] = array of type
 *   - ? = column is optional
 *   - \* = (Only allowed w/ type = string) allows symbols/spaces in string */
export type ValidationString =  `${
    BaseType | `${typeof baseTypes.string}${typeof typeSuffixes.hasSpaces}` /* string* */
}${
    "" | typeof typeSuffixes.isArray /* [] */ | typeof typeSuffixes.isOptional /* ? */
}`


export type ValidationType = {
    /** Base type (No *[]? suffixes)
     *   - Defintion MUST include a type or a typeStr
     *   - default: parsed from typeStr */
    type?:        BaseType,
    
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

export type ValidationTypeFull = OneOrMore<Partial<ValidationType> & {
    /** Validation type of form: type*[]? (All suffixes are optional)
    *   - type = string, uuid, b64[url], hex, date, datetime, boolean, int, float, object, any
    *   - [] = array of type
    *   - ? = column is optional
    *   - \* = (Only allowed w/ type = string) allows symbols/spaces in string */
    typeStr?: ValidationString
}, 'type'|'typeStr'>

export type ValidationOptions = ValidationTypeFull & { key: string, isIn: RequestField[]}

type ModelBase = { schema: Record<string,any> }
export type KeyArr<Model extends ModelBase> = Array<keyof Model['schema']> 
export type KeyObj<Model extends ModelBase> = { [inputKey: string]: keyof Model['schema'] }
export type SchemaKeys<Model extends ModelBase> = KeyArr<Model> | KeyObj<Model> | 'all'

export type ModelValidationOptions<Model extends ModelBase> = {
    /** Keys in params: [...keyList] OR { inputKey: modelKey, ... } OR 'all' (= All keys in types) */
    params?: SchemaKeys<Model>,
    /** Make all body/query keys optional (params are unaffected) [default: true] */
    optionalBody?: boolean,
    /** Move 'body' validation to 'query' (for GET routes) [default: false] */
    asQueryStr?: boolean,
    /** Allow entering less than the minLength for strings (to validate for searches) [default: false] */
    allowPartials?: boolean,
    /** Additional validation to append to model validation */
    additional?: readonly ValidationOptions[],
}

export type BaseType = typeof baseTypes[keyof typeof baseTypes]
export type TypeSuffix = typeof typeSuffixes[keyof typeof typeSuffixes]
export type RequestField = typeof requestFields[keyof typeof requestFields]

type Limit = { min?: number, max?: number }
export type Limits = Limit & { elem?: Limit, array?: Limit }
export type LimitsFalsable = (Limit & { elem?: Limit | false, array?: Limit | false }) | false

export type TypeDef = BaseType | "array"