import type { TypeOf, TypeStr } from "./global.d"

export const sqlTypes = {
    Text:   "TEXT",
    Int:    "INTEGER",
    Float:  "REAL",
    Blob:   "BLOB",
} as const
export const sqlSuffixes = {
    primary:  " PRIMARY KEY",
    required: " NOT NULL",
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

/** Key to Where operation for a partial match,
 *  using these type-dependant rules:
 *   - Bitmap: Is superset of (Or equals, if zero) value
 *   - Boolean: Equals value after converting to boolean
 *   - String: Contains value as a substring
 *   - Number: (TODO) Is in range of value
*/
export const whereOpPartial = '$in'

/** Special operations for Where data
 *   - Using these keys, create a nested object under the schema key 
 *   - Value of the key should be a literal value to compare to
 **/
export const whereOp = {
    /** Greater than */
    $gt:  '>',
    /** Less than */
    $lt:  '<',
    /** Greater than or equal to */
    $gte: '>=',
    /** Less than or equal to */
    $lte: '<=',
    /** Equals */
    $eq:  '==',
    /** Partial match (Type dependant):
     *   - Bitmap: Is superset of (Or equals, if zero) value
     *   - Boolean: Equals value after converting to boolean
     *   - String: Contains value as a substring
     *   - Number: (TODO) Is in range of value
     **/
    [whereOpPartial]:  'PARTIAL_MATCH',
} as const

/** Matches inverse of contained rules */
export const whereNot = '$not'

/** Joining logic for Where data
 *   - Value of the key should be an array of Where data
 *   - Base value if none given = AND
 **/
export const whereLogic = {
    $or:  'OR',
    $and: 'AND',
} as const

/** Special operations for updating values in database
 *   - Only applied if value type matches cooresponding key (ie. 'number')
 *   - Will not work on child tables (ie. array entries) */
export const updateOps = {
    /** Operations for Numeric data (Including Bitmaps) */
    number: {
        /** Increment */
        $inc: '+',
        /** Decrement */
        $dec: '-',
        /** Bitwise AND (Mask value) */
        $mask: '&',
        /** Bitwise OR (Add to Bitmap) */
        $or:  '|',
        /** Bitwise Exclusive OR */
        $xor:  '^',
    },
} as const


/** Related functions of updateOps */
export const updateFunctions: UpdateFunc<typeof updateOps> = {
    number: {
        $inc:  (value, amount) => value + amount,
        $dec:  (value, amount) => value - amount,
        $mask: (value, amount) => value & amount,
        $or:   (value, amount) => value | amount,
        $xor:  (value, amount) => value ^ amount,
    },
}


export const allOps = [
    ...Object.keys(whereOp),
    ...Object.values(updateOps).flatMap((op) => Object.keys(op)),
]


/** Enforces creation of a valid update function for each update op */
type UpdateFunc<T extends Record<string,Record<string, any>>> = {
    [K in keyof T & string]: Record<keyof T[K], (a: TypeStr<K>, b: TypeStr<K>) => TypeStr<K>>
} & Omit<Partial<Record<TypeOf,undefined>>, keyof T>