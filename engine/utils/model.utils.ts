import type Model from '../models/Model'
import type { ModelBase } from '../models/Model'
import type { ChangeCallback, CommonDefinition, Definition, DefinitionSchema, ForeignKeyRef, SchemaBase } from '../types/Model.d'
import type { IfExistsBehavior, SQLParams, SQLSuffix, SQLType, SQLTypeFull, WhereData, WhereLogic, WhereNot, WhereOps } from '../types/db.d'
import type { HTMLType } from '../types/gui.d'
import { adapterTypes, childLabel } from '../types/Model'
import { foreignKeyActions, sqlSuffixes, sqlTypes, whereLogic, whereNot, whereOp, whereOpPartial } from '../types/db'
import { htmlTypes } from '../types/gui'

import RegEx from '../libs/regex'
import { isDate } from '../libs/date'
import { isIn } from './common.utils'
import { combineSQL, insertSQL, deleteSQL } from './db.utils'
import { parseBoolean, parseArray } from './validate.utils'
import { CONCAT_DELIM, getChildName } from '../config/models.cfg'

// Initialize Parsers
const toBool = parseBoolean(true)
const toArray = parseArray(true)


/** Default entry for db.services.reset.refs */
export const childTableRefs = ({ title, primaryId }: Pick<ModelBase,'title'|'primaryId'>): ForeignKeyRef => ({
  key: childLabel.foreignId,
  table: title,
  refKey: primaryId,
  onDelete: foreignKeyActions.Cascade,
  onUpdate: foreignKeyActions.Cascade,
})

/** Split keys from data into Parent & Child lists */
export const splitKeys = (data: any, childSchema: any) => {
  const children = Object.keys(childSchema).filter((key) => key in data)
  return {
    children,
    parent: Object.keys(data).filter((key) => !children.includes(key)),
  }
}

/** Get an Updater Callback that will increment the given key */
export const incrementCb = <Schema extends SchemaBase>(key: keyof Schema & string): ChangeCallback<Schema> => (update, matching) => ({
  ...update,
  [key]: (matching[0]?.guiCount || 0) + 1,
})


/** Generate SQL and Params for inserting one or more children.
 *   - If primaryKey is a number, this will be treated as an auto-incrementing rowId
 *   - IfExists.overwrite will only overwrite individual child indicies
 *   - overwriteChild=true will clear the entire child object/array */
export const childSQL = <T>(
  tableName: string, childData: T[], childKeys: (keyof T)[],
  primaryKey: keyof T | number, ifExists: IfExistsBehavior, overwriteChild = false
) =>
  combineSQL(childKeys.map((key) => {
    const foreignIds: any[] = []

    const entries = propertyIsChild(childData, key).flatMap((data, i) => {
      const foreignId = typeof primaryKey !== 'number' ? data[primaryKey] : primaryKey + i + 1
      overwriteChild && foreignIds.push(foreignId)

      return data[key].map((value, index) => ({
        [childLabel.foreignId]: foreignId,
        [childLabel.index]:     index,
        [childLabel.value]:     value,
      }))
    })
    
    if (!entries.length) return;

    const childTable = getChildName(tableName, key)

    const insert = insertSQL(
      childTable,
      entries,
      Object.values(childLabel),
      ifExists
    )

    return !overwriteChild ? insert : combineSQL([
      deleteSQL(
        childTable,
        childLabel.foreignId,
        foreignIds,
      ),
      insert,
    ])
  }))


const hasNot = RegEx(/^NOT\s/i)
function notParams<P extends SQLParams | SQLParams[number]>(params: P) {
  if (!Array.isArray(params) || typeof params[0] !== 'string')
    Object.values(params).forEach(notParams)
  else
    params[0] = hasNot.test(params[0]) ? params[0].slice(4) : `NOT ${params[0]}`
  return params
}

const inequalities = Object.keys(whereOp).filter((op) => op !== whereOpPartial) as WhereOps[]
export function getSqlParams<Schema extends SchemaBase, DBSchema extends SchemaBase>(
  { title, schema, children }: Pick<Model<Schema, DBSchema>, 'title'|'schema'|'children'>,
  matchData?: WhereData<DBSchema>,
): SQLParams {

  let params: SQLParams = []
  if (!matchData) return params

  Object.entries(matchData).forEach(([key,val]) => {
    // Child search (Not implemented)
    if (key in children) throw new Error(`Child search not implemented: Child key "${key}" in query.`)

    // Default Inequality (Equals)
    if (typeof val !== 'object')
      return params.push([`${title}.${key} ${whereOp._eq} ?`, val])
    
    // Nested Logic
    if (whereNot in val)
      return params.push(
        ...notParams(getSqlParams({ title, schema, children }, val[whereNot]))
      )
    
    for (const logic in whereLogic) {
      if (logic in val) return params.push({
        [logic]: getSqlParams({ title, schema, children }, val[logic])
      })
    }

    // Inequalities
    for (const op in inequalities) {
      if (op in val) return params.push(
        [`${title}.${key} ${whereOp[op as WhereOps]} ?`, val[op]]
      )
    }
    
    // Includes
    if (whereOpPartial in val) {
      val = val[whereOpPartial]
        
      if (schema[key].isBitmap && val != null)
        return params.push([`${title}.${key} ${+val ? '&' : '=='} ?`, +val])
  
      if (isBool(schema[key]))
        return params.push([`${title}.${key} == ?`, +toBool(val)])
  
      if (typeof val === 'string')
        return params.push([`${title}.${key} LIKE ?`, `%${val}%`])
    }
    

    // Default (Equals stringified value)
    params.push([
      `${title}.${key} ${whereOp._eq} ?`,
      !val || typeof val === 'number' ? val : JSON.stringify(val)
    ])
  })

  return params
}

/** Convert standard Schema to All Partial Matches */
export const toPartialMatch = <T extends object>(data: T): WhereData<object> =>
  Object.entries(data).reduce<WhereData<object>>(
    (where, [key,val]) => ({ ...where, [key]: { [whereOpPartial]: val } }),
    {}
  )



export const isBool = ({ type, isArray }: Pick<Definition,'type'|'isArray'>) => type === 'boolean' && !isArray

/** Filter an array of objects, keeping objects where the given property is an array. */
export const propertyIsChild = <O, P extends keyof O>(arrayOfObjects: O[], property: P) =>
  arrayOfObjects.filter(
    (obj) => Array.isArray(obj[property]) && (obj[property] as any[]).length
  ) as (O & { [property in P]: any[] })[]

export const isDbKey = <DBSchema extends SchemaBase, Schema extends SchemaBase>
  (idKey: any, schema: DefinitionSchema<DBSchema,Schema>): idKey is keyof DBSchema & string =>
    !idKey || Boolean(isIn(idKey, schema) && schema[idKey].db)


export function sanitizeSchemaData
  <Schema extends SchemaBase, DBSchema extends SchemaBase, T extends SchemaBase>
  (data: T, { schema, children }: SanitModel<Schema, DBSchema> = {}): Sanitized<T, Schema, DBSchema>
{
  const validKeys = schema && Object.keys(schema)
    .filter((key) => schema[key].db)
    .concat(Object.keys(children || {}))

  return Object.keys(data).reduce(
    (obj, key) =>
      !validKeys || validKeys.includes(key)             ? { ...obj, [key]: data[key]                           } :
      key === whereNot && typeof data[key] === 'object' ? { ...obj, [key]: sanitizeSchemaData(data[key] || {}) } :
      key in whereLogic && Array.isArray(data[key])     ? { ...obj, [key]: data[key].map(sanitizeSchemaData)   } :
        obj,
    {} as Sanitized<T, Schema, DBSchema>
  )
}


/** Convert primary key definition to regular definition */
export const stripPrimaryDef = <Schema extends SchemaBase, DBSchema extends SchemaBase>
  ({ db, isPrimary, isOptional, ...definition }: CommonDefinition<Schema,DBSchema>) => ({
    ...definition,
    db: db ? db.replace(' PRIMARY KEY', ' NOT NULL') as SQLTypeFull : false as false,
  })


/** Convert model type to SQL type */
export function dbFromType<D extends Definition>
  ({ type, isOptional, isPrimary }: Pick<D,'type'|'isOptional'|'isPrimary'>): SQLTypeFull
{
  let dbType: SQLType, dbSuffix: SQLSuffix | '' = ''
  
  switch (type) {
    case 'float':
      dbType = sqlTypes.Float
      break
    case 'boolean':
    case 'date':
    case 'datetime':
    case 'int':
      dbType = sqlTypes.Int
      break
    default:
      dbType = sqlTypes.Text
  }

  if (isPrimary) dbSuffix = sqlSuffixes.primary
  else if (!isOptional) dbSuffix = sqlSuffixes.required

  return `${dbType}${dbSuffix}`
}


/** Convert Model type to HTML input type */
export function htmlFromType<D extends Definition>
  ({ type, isArray }: Pick<D,'type'|'isArray'>): HTMLType
{
  switch (isArray ? 'array' : type) {
    case 'boolean':   return htmlTypes.checkbox
    case 'date':      return htmlTypes.date
    case 'datetime':  return htmlTypes.datetime
    case 'int':
    case 'float':     return htmlTypes.number
    default:          return htmlTypes.text
  }
}


/** Convert data from storage type to expected type */
export function getAdapterFromType<S extends SchemaBase, D extends SchemaBase>
  ({ type, isArray, isBitmap }: Pick<Definition<S,D>, 'type'|'isArray'|'isBitmap'>)
{
  let adapter: ((val: any) => any) | undefined;
  if (isBitmap) return undefined

  switch (type) {
    case 'object':
      adapter = (text) => typeof text === 'string' ? JSON.parse(text)    : text
      break
    case 'date':
    case 'datetime':
      adapter = (num) => num && new Date(+num)
      break
    case 'boolean':
      adapter = (int) => int == null ? null : +int !== 0
      break
  }

  if (isArray) {
    const entryGet = adapter
    adapter = entryGet ? 
      (text) => typeof text === 'string' && text ? text.split(CONCAT_DELIM).map(entryGet) :
        Array.isArray(text) ? text.map(entryGet) : null
      : 
      (text) => typeof text === 'string' && text ? text.split(CONCAT_DELIM) :
        Array.isArray(text) ? text : null
  }

  return adapter as Definition<S,D>[typeof adapterTypes.get]
}


/** Convert data from user input to storage type */
export function setAdapterFromType<S extends SchemaBase, D extends SchemaBase>
  ({ type, isArray, isBitmap }: Pick<Definition<S,D>, 'type'|'isArray'|'isBitmap'>)
{
  let adapter: ((val: any) => any) | undefined;
  if (isBitmap) return undefined

  switch (type) {
    case 'int':
      adapter = (text) => typeof text === 'string' ? parseInt(text)   : text
      break
    case 'float':
      adapter = (text) => typeof text === 'string' ? parseFloat(text) : text
      break
    case 'object':
      adapter = (obj)  => typeof obj  === 'object' && obj ? JSON.stringify(obj) : obj
      break
    case 'date':
    case 'datetime':
      adapter = (date) => typeof date === 'number' ? date :
        !date ? null : isDate(date) ? date.getTime() : 
          !isNaN(date) ? +date : new Date(date).getTime() // Fallback
      break
    case 'boolean':
      adapter = (bool) => bool == null ? bool : +toBool(bool)
      break
  }

  if (isArray) {
    const entrySet = adapter
    adapter = entrySet ?
      (arr) => 
        typeof arr === 'string' ? toArray(arr)?.map(entrySet) :
        Array.isArray(arr) ? arr.map(entrySet) : null
      :
      (arr) =>
        typeof arr === 'string' ? toArray(arr) :
        Array.isArray(arr) ? arr : null
  }

  return adapter as Definition<S,D>[typeof adapterTypes.set]
}


// TYPE HELPERS

type Sanitized<T extends SchemaBase, Schema extends SchemaBase, DBSchema extends SchemaBase> =
  Pick<T, (keyof Schema | WhereLogic | WhereNot | keyof SanitModel<Schema, DBSchema>['children']) & keyof T>

type SanitModel<Schema extends SchemaBase, DBSchema extends SchemaBase> = Partial<Pick<ModelBase<Schema, DBSchema>,'schema'|'children'>>