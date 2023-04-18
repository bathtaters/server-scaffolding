import type { RequestField, ValidationOptions, ModelValidationOptions, SchemaKeys, KeyArr, KeyObj } from '../types/validate.d'
import type { Middleware } from '../types/express'
import type { DefinitionSchema, SchemaBase } from '../types/Model.d'
import type { ModelBase } from '../models/Model'
import { type Schema, checkSchema } from 'express-validator'
import checkValidation from '../middleware/validate.middleware'
import { generateSchema, appendToSchema } from '../services/validate.services'
import { adaptSchemaEntry } from '../services/model.services'
import { toArraySchema } from '../utils/validate.utils'
import { filterDupes } from '../utils/common.utils'


/** Convert express-validator Schema to Middleware  */
const toMiddleware = (validationSchema: Schema) =>
  (checkSchema(toArraySchema(validationSchema)) as Middleware[])
    .concat(checkSchema(validationSchema))
    .concat(checkValidation)


/** Convert SchemaKeys 'all' to list of all schema keys (w/ HTML field) */
const getAllKeys = <M extends ModelValBase>
  (keys: SchemaKeys<M>, schema: M['schema'], primaryId: M['primaryId']): Exclude<SchemaKeys<M>,'all'> =>
    keys !== 'all' ? keys :
      Object.keys(schema)
        .filter((key) => schema[key].html || key === primaryId)



/**
 * Get validation middleware using custom schema
 * @param schema - Model-type schema
 * @param isIn - data type in request object (body|params|query|headers|cookies)
 * @param options - Additional options
 * @param options.forceOptional - force all data to be optional
 * @param options.additional - Additional validation to append to model validation
 * @returns Validation Middleware
 */
export const byObject = <S extends SchemaBase>(
  schema: DefinitionSchema<S>,
  isIn: RequestField[] = ['body'],
  { forceOptional = false, additional = [] as ValidationOptions[] } = {}
) => toMiddleware(
  appendToSchema({},
    Object.entries(schema).map(
      ([key, val]) => ({
        key,
        isIn,
        ...adaptSchemaEntry(forceOptional ? { ...val, isOptional: true } : val)
      })
    ).concat(additional)
  )
)



/**
 * Fetch validation middleware using associated Model types & limits (also removes any keys in params from body)
 * @param Model - Model instance to generate validation for
 * @param body - Keys in body: [...keyList] OR { inputField: modelKey, ... } OR 'all' (= All keys in types)
 * @param options - Additional options
 * @param options.params - Keys in params: [...keyList] OR { inputKey: modelKey, ... } OR 'all' (= All keys in types)
 * @param options.optionalBody - Make all body/query keys optional (params are unaffected) [default: true]
 * @param options.asQueryStr - Move 'body' validation to 'query' (for GET routes) [default: false]
 * @param options.allowPartials - Allow entering less than the minLength for strings (to validate for searches) [default: false]
 * @param options.additional - Additional validation to append to model validation
 * @returns Validation Middleware
 */
export function byModel<M extends ModelValBase>(
  { schema, primaryId }: M,
  body: SchemaKeys<M> = [],
  {
    params = [],
    optionalBody = true,
    asQueryStr = false,
    allowPartials = false,
    additional
  }: ModelValidationOptions<M> = {}
) {

  // Convert 'all' to all keys
  let keysByField: { [field in RequestField]+?: KeyArr<M> | KeyObj<M> } = {
    params: getAllKeys(params, schema, primaryId),
    [asQueryStr ? 'query' : 'body']: getAllKeys(body, schema, primaryId),
  }

  // Build list of keys (combining similar) + keyDict of { validation names: model keys }
  let keysDict: KeyObj<M> = {},
    keyList: KeyList<M> = {}

  Object.entries(keysByField).forEach(([inType, keys]) => {
    
    if (!Array.isArray(keys)){
      Object.assign(keysDict, keys)
      keys = filterDupes(Object.values(keys))
    }

    keys.forEach((key) =>
      keyList[key] = (keyList[key] || []).concat(inType as RequestField)
    )
  })

  // Call generateSchema on each entry in keyList to create validationSchema
  const validationSchema = Object.entries(keyList).reduce(
    (valid, [key, isIn]) => Object.assign(
      valid,
      generateSchema(
        key, schema[key], isIn,
        optionalBody || key === primaryId || 'default' in schema[key],
        allowPartials
      )
    ),
    {} as ModelValSchema<M>
  )

  if (!Object.keys(keysDict).length)
    return toMiddleware(appendToSchema(validationSchema, additional))


  // Assign model keys to validation names based on keyDict 
  let renamedSchema: Schema = {},
    missing = Object.keys(validationSchema)

  Object.entries(keysDict).forEach((([newKey, oldKey]) => {
    renamedSchema[newKey] = validationSchema[oldKey]

    const oldIdx = missing.indexOf(oldKey as string)
    if (oldIdx >= 0) missing.splice(oldIdx, 1)
  }))

  // Copy any missed schema
  missing.forEach((key) => renamedSchema[key] = validationSchema[key])
  
  // Append 'additional' schema
  return toMiddleware(appendToSchema(renamedSchema, additional))
}



// TYPE HELPERS

export type ModelValBase = Pick<ModelBase,'schema'|'primaryId'>
type ModelValSchema<M extends ModelValBase> = Record<keyof M['schema'], Schema[string]>
type KeyList<M extends ModelValBase> = Partial<Record<keyof M['schema'], RequestField[]>>