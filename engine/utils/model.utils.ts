import type Model from '../models/Model'
import type { ModelBase } from '../models/Model'
import type { Adapter, CommonDefinition, Definition, DefinitionSchema, ForeignKeyRef, SchemaBase } from '../types/Model.d'
import type { IfExistsBehavior, SQLParams, SQLSuffix, SQLType, SQLTypeFull, WhereData, WhereLogic, WhereNot, WhereOps } from '../types/db.d'
import type { ValidationExpanded } from '../types/validate.d'
import type { HTMLType } from '../types/gui.d'
import { childLabel } from '../types/Model'
import { foreignKeyActions, sqlSuffixes, sqlTypes, whereLogic, whereNot, whereOp, whereOpPartial } from '../types/db'
import { htmlTypes } from '../types/gui'

import RegEx from '../libs/regex'
import { isDate } from '../libs/date'
import { isIn } from './common.utils'
import { insertSQL, deleteSQL } from './db.utils'
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


/** Generate SQL and Params for inserting one or more children.
 *   - If primaryKey is a number, this will be treated as an auto-incrementing rowId
 *   - IfExists.overwrite will only overwrite individual child indicies
 *   - overwriteChild=true will clear the entire child object/array */
export const childSQL = <T>(
  tableName: string, childData: T[], childKeys: (keyof T)[],
  primaryKey: keyof T | number, ifExists: IfExistsBehavior, overwriteChild = false
) =>
  childKeys.flatMap((key) => {
    const childTable = getChildName(tableName, key)
    let foreignIds: any[] = []

    const entries = propertyIsChild(childData, key).flatMap((data, i) => {
      const foreignId = typeof primaryKey !== 'number' ? data[primaryKey] : primaryKey + i + 1
      overwriteChild && foreignIds.push(foreignId)

      return data[key].map((value, index) => ({
        [childLabel.foreignId]: foreignId,
        [childLabel.index]:     index,
        [childLabel.value]:     value,
      }))
    })
    
    const overwriteSQL = overwriteChild && foreignIds.length && deleteSQL(
      childTable,
      foreignIds.map((id, idx) => [
        !idx ? `${childLabel.foreignId} IN (${foreignIds.map(() => '?').join(',')})` : '',
        id
      ])
    )
    if (!entries.length) return overwriteSQL ? [overwriteSQL] : []

    const addSQL = insertSQL(
      childTable,
      entries,
      Object.values(childLabel),
      ifExists
    )
    return overwriteSQL ? [overwriteSQL, addSQL] : [addSQL]
  })


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
      return params.push([`${title}.${key} ${whereOp.$eq} ?`, val])
    
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

      if (Array.isArray(val))
        return val.forEach((entry,idx) => params.push([
          idx ? '' : `${title}.${key} IN (${val.map(() => '?').join(',')})`,
          entry
        ]))
        
      if (schema[key].isBitmap && val != null) {
        const num = +val
        params.push([`${title}.${key} ${num ? '& ? ==' : '=='} ?`, +val])
        return num && params.push(['',+val])
      }
  
      if (isBool(schema[key]))
        return params.push([`${title}.${key} == ?`, +toBool(val)])
  
      if (typeof val === 'string')
        return params.push([`${title}.${key} LIKE ?`, `%${val}%`])
    }
    

    // Default (Equals stringified value)
    params.push([
      `${title}.${key} ${whereOp.$eq} ?`,
      !val || typeof val === 'number' ? val : JSON.stringify(val)
    ])
  })

  return params
}

/** Convert standard Schema to All Partial Matches */
export const toPartialMatch = <T extends object>(data?: T): WhereData<object> | undefined =>
  data && Object.entries(data).reduce<WhereData<object>>(
    (where, [key,val]) => ({ ...where, [key]: { [whereOpPartial]: val } }),
    {}
  )



export const isBool = ({ typeBase, isArray }: ValidationExpanded) => typeBase === 'boolean' && !isArray

/** Filter an array of objects, keeping objects where the given property is an array. */
export const propertyIsChild = <O, P extends keyof O>(arrayOfObjects: O[], property: P) =>
  arrayOfObjects.filter(
    (obj) => Array.isArray(obj[property])
  ) as (O & { [property in P]: any[] })[]

export const isDbKey = <DBSchema extends SchemaBase, Schema extends SchemaBase>
  (idKey: any, schema: DefinitionSchema<DBSchema,Schema>): idKey is keyof DBSchema & string =>
    !idKey || Boolean(isIn(idKey, schema) && schema[idKey].db)


export function sanitizeSchemaData
  <Schema extends SchemaBase, DBSchema extends SchemaBase, T extends SchemaBase>
  (data: T, { schema, children }: SanitModel<Schema, DBSchema> = {}): T
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
    {} as T
  )
}


/** Convert primary key definition to regular definition */
export const stripPrimaryDef = <Schema extends SchemaBase, DBSchema extends SchemaBase>
  ({ db, isOptional, ...definition }: CommonDefinition<Schema,DBSchema>) => ({
    ...definition,
    db: db ? db.replace(' PRIMARY KEY', ' NOT NULL') as SQLTypeFull : false as false,
  })


/** Convert model type to SQL type */
export function dbFromType({ typeBase, isOptional }: ValidationExpanded, isPrimary = false): SQLTypeFull {
  let dbType: SQLType, dbSuffix: SQLSuffix | '' = ''
  
  switch (typeBase) {
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
export function htmlFromType({ typeBase, isArray }: ValidationExpanded): HTMLType {
  switch (isArray ? 'array' : typeBase) {
    case 'boolean':   return htmlTypes.checkbox
    case 'date':      return htmlTypes.date
    case 'datetime':  return htmlTypes.datetime
    case 'int':
    case 'float':     return htmlTypes.number
    default:          return htmlTypes.text
  }
}


/** Convert data from storage type to expected type */
export function getAdapterFromType({ typeBase, isArray }: ValidationExpanded, isBitmap = false) {
  let adapter: Adapter<any,any> | undefined;
  if (isBitmap) return false

  switch (typeBase) {
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
      (text, data) => typeof text === 'string' && text ? text.split(CONCAT_DELIM).map((v) => entryGet(v, data)) :
        Array.isArray(text) ? text.map((v) => entryGet(v, data)) : []
      : 
      (text) => typeof text === 'string' && text ? text.split(CONCAT_DELIM) :
        Array.isArray(text) ? text : []
  }

  return adapter || false
}


/** Convert data from user input to storage type */
export function setAdapterFromType({ typeBase, isArray }: ValidationExpanded, isBitmap = false) {
  let adapter: Adapter<any,any> | undefined;
  if (isBitmap) return false

  switch (typeBase) {
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
      (arr, data) => 
        typeof arr === 'string' ? toArray(arr)?.map((v) => entrySet(v, data)) :
        Array.isArray(arr) ? arr.map((v) => entrySet(v, data)) : null
      :
      (arr) =>
        typeof arr === 'string' ? toArray(arr) :
        Array.isArray(arr) ? arr : null
  }

  return adapter || false
}


// TYPE HELPERS

type SanitModel<Schema extends SchemaBase, DBSchema extends SchemaBase> = Partial<Pick<ModelBase<Schema, DBSchema>,'schema'|'children'>>