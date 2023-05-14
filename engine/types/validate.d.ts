import type { baseTypes, typeSuffixes, requestFields, stringTypes, dateTypes, numTypes } from "./validate"

/** Structure of Type value string */
type ValidationType = `${
    ValidationBase |
    `${typeof baseTypes.string}${typeof typeSuffixes.hasSpaces}` /* string* */
}${
    ""                             /*       No suffix     */ |
    typeof typeSuffixes.isArray    /*    Array suffix: [] */ |
    typeof typeSuffixes.isOptional /* Optional suffix: ?  */
}`

/** Convert ValidationBases to Types */
type BaseType<S extends ValidationType> = 
    BaseOfValidation<S> extends StringType     ? string :
    BaseOfValidation<S> extends NumType        ? number :
    BaseOfValidation<S> extends DateType       ? Date :
    BaseOfValidation<S> extends 'object'       ? Record<string,any> :
    BaseOfValidation<S> extends 'boolean'      ? boolean :
    BaseOfValidation<S> extends ValidationBase ? any :
        never

/** Basic Validation -- Expected to be entered by user */
export type ValidationBasic = {
    /** Validation type of form: type*[]? (All suffixes are optional)
     *   - type = string, uuid, b64[url], hex, date, datetime, boolean, int, float, object, any
     *   - [] = array of type
     *   - ?  = column is optional (Arrays cannot be optional)
     *   - *  = (Only allowed w/ type = string) allows symbols/spaces in string */
    type: ValidationType

    /** Limit object
     *   - { min?, max? } | { array: { min?, max? }, elem: { min?, max? } }
     *   - undefined = default limits; false = no limits
     *   - Sets limits on numbers, string length or array size */
    limits?: LimitsFalsable,
}

/** Expanded Validation -- Used within Validation methods */
export type ValidationExpanded = Pick<ValidationBasic, 'limits'> & {
    /** Base type = string, uuid, b64[url], hex, date, datetime, boolean, int, float, object, any
     *   - Parsed from typeStr */
    typeBase:     ValidationBase,

    /** Value can be undefined
     *   - Parsed from typeStr as '?' suffix */
    isOptional?:  boolean,

    /** If column is an array of <type>
     *   - This will auto-create and link a related table for this column
     *      unless "db" property is defined
     *   - Parsed from typeStr as '[]' suffix */
    isArray?:     boolean,

    /** If a string column will allow spaces & special characters
     *   - Parsed from typeStr as '*' suffix */
    hasSpaces?:   boolean,
}

/** Additional Validation Options appended to Basic Validation */
export type ValidationOptions = ValidationBasic & { key: string, isIn: RequestField[] }

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

export type ValidationBase = typeof baseTypes[keyof typeof baseTypes]
export type TypeSuffix     = typeof typeSuffixes[keyof typeof typeSuffixes]
export type RequestField   = typeof requestFields[keyof typeof requestFields]

type Limit = { min?: number, max?: number }
export type Limits = Limit & { elem?: Limit, array?: Limit }
export type LimitsFalsable = (Limit & { elem?: Limit | false, array?: Limit | false }) | false

export type TypeDef = ValidationBase | "array"

/** Extract Type from ValidationType string */
export type ExtractType<S extends ValidationType> =
    (IsArray<S> extends true    ? Array<BaseType<S>> : BaseType<S>) |
    (IsOptional<S> extends true ? null : never)



// ValidationType DECODERS

type StringType = typeof stringTypes[keyof typeof stringTypes]
type DateType   = typeof dateTypes[keyof typeof dateTypes]
type NumType    = typeof numTypes[keyof typeof numTypes]

/** Extract ValidationBase string from ValidationType */
type BaseOfValidation<S extends ValidationType> =
    S extends `${infer T}${TypeSuffix | ''}${TypeSuffix | ''}${TypeSuffix | ''}` ?
        T extends ValidationBase ? T : never : never

/** Extract isArray value from ValidationType */
type IsArray<S extends ValidationType> =
    S extends `${ValidationBase}${string}${typeof typeSuffixes.isArray}${string}` ?
        true : false

/** Extract isOptional value from ValidationType */
type IsOptional<S extends ValidationType> =
    S extends `${ValidationBase}${string}${typeof typeSuffixes.isOptional}${string}` ?
        true : false