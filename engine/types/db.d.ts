export const sqlTypes = {
    Text:   "TEXT",
    Int:    "INTEGER",
    Float:  "REAL",
    Blob:   "BLOB",
} as const

export const ifExistsBehaviors = {
    default:   "default",
    overwrite: "overwrite",
    skip:      "skip",
    abort:     "abort",
} as const

export const foreignKeyActions = {
    None:     "NO ACTION",
    Restrict: "RESTRICT",
    Null:     "SET NULL",
    Default:  "SET DEFAULT",
    Cascade:  "CASCADE",
} as const

  
export type SQLType = typeof sqlTypes[keyof typeof sqlTypes]
export type IfExistsBehavior = typeof ifExistsBehaviors[keyof typeof ifExistsBehaviors]
export type ForeignKeyAction = typeof foreignKeyActions[keyof typeof foreignKeyActions]