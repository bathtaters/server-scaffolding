export const stringTypes = {
    string:   "string",
    uuid:     "uuid",
    b64:      "b64",
    b64url:   "b64url",
    hex:      "hex",
    html:     "html",
} as const

export const numTypes = {
    int:      "int",
    float:    "float",
} as const

export const dateTypes = {
    date:     "date",
    datetime: "datetime",
} as const

export const baseTypes = {
    ...stringTypes,
    ...numTypes,
    ...dateTypes,
    boolean:  "boolean",
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
