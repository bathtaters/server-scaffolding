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
 *   - Bitmap: Intersects with (Or equals, if zero) value
 *   - Boolean: Equals value after converting to boolean
 *   - String: Contains value as a substring
 *   - Number: (TODO) Is in range of value
*/
export const whereOpPartial = '_in'

/** Special operations for Where data
 *   - Using these keys, create a nested object under the schema key 
 *   - Value of the key should be a literal value to compare to
 **/
export const whereOp = {
    /** Greater than */
    _gt:  '>',
    /** Less than */
    _lt:  '<',
    /** Greater than or equal to */
    _gte: '>=',
    /** Less than or equal to */
    _lte: '<=',
    /** Equals */
    _eq:  '==',
    /** Partial match (Type dependant):
     *   - Bitmap: Intersects with (Or equals, if zero) value
     *   - Boolean: Equals value after converting to boolean
     *   - String: Contains value as a substring
     *   - Number: (TODO) Is in range of value
     **/
    [whereOpPartial]:  'PARTIAL_MATCH',
} as const

/** Matches inverse of contained rules */
export const whereNot = '_not'

/** Joining logic for Where data
 *   - Value of the key should be an array of Where data
 *   - Base value if none given = AND
 **/
export const whereLogic = {
    _or:  'OR',
    _and: 'AND',
} as const

/** Special operations for updating numeric values
 *   - Value should be amount to increment/decrement by
 */
export const updateNumberOp = {
    _inc: '+',
    _dec: '-',
}