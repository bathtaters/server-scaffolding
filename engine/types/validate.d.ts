export const modelTypes = {
    string: "string",
    uuid: "uuid",
    b64: "b64",
    b64url: "b64url",
    hex: "hex",
    date: "date",
    datetime: "datetime",
    boolean: "boolean",
    int: "int",
    float: "float",
    object: "object",
    any: "any",
} as const

export type Definition = { // TO EXPAND 
    in: any,
    customSanitizer?: any,
    toArray?: any,
    optional?: any,
}

type Limit = { min?: number, max?: number }
export type Limits = Limit & { elem?: Limit, array?: Limit }

export type Schema = Record<string, Definition>
export type ModelType = typeof modelTypes[keyof typeof modelTypes]
export type TypeDef = ModelTypes | 'array'

const T = typeof 0
export type TypeOf = typeof T