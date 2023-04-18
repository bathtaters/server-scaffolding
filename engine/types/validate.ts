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
