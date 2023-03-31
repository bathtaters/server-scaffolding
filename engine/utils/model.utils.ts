import type { ModelBase } from '../models/Model'
import type { Definition, ForeignKeyRef, SchemaBase } from '../types/Model.d'
import type { SQLSuffix, SQLType, SQLTypeFull } from '../types/db.d'
import { HTMLType, htmlTypes } from '../types/gui.d'

import { isDate } from '../libs/date'
import { parseBoolean, parseArray } from './validate.utils'
import { CONCAT_DELIM } from '../config/models.cfg'
import { arrayLabel } from '../types/Model.d'
import { foreignKeyActions, sqlSuffixes, sqlTypes } from '../types/db.d'

// Initialize Parsers
const toBool = parseBoolean(true)
const toArray = parseArray(true)


/** Default entry for db.services.reset.refs */
export const arrayTableRefs = ({ title, primaryId }: Pick<ModelBase,'title'|'primaryId'>): ForeignKeyRef => ({
  key: arrayLabel.foreignId,
  table: title,
  refKey: primaryId,
  onDelete: foreignKeyActions.Cascade,
  onUpdate: foreignKeyActions.Cascade,
})


export const isBool = ({ type, isArray }: Pick<Definition,'type'|'isArray'>) => type === 'boolean' && !isArray


export function sanitizeSchemaData
  <Schema extends SchemaBase, DBSchema extends SchemaBase, T extends SchemaBase>
  (data: T, { schema, arrays }: SanitModel<Schema, DBSchema> = {})
{
  const validKeys = schema && Object.keys(schema)
    // @ts-ignore -- TODO: Fix/Remove TS from global.d
    .filter((key) => schema[key].db)
    .concat(Object.keys(arrays || {}))

  return Object.keys(data).reduce(
    (obj, key) =>
      !validKeys || validKeys.includes(key) ? { ...obj, [key]: data[key] } : obj,
    {} as Sanitized<T, Schema, DBSchema>
  )
}


/** Convert primary key definition to regular definition */
export const stripPrimaryDef = <D extends Definition>
  ({ db, isPrimary, isOptional, ...definition }: D) => ({
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
export function getAdapterFromType<D extends Definition>
  ({ type, isArray, isBitmap }: Pick<D, 'type'|'isArray'|'isBitmap'>): D['getAdapter']
{
  let adapter: ((v: any) => any) | undefined;
  if (isBitmap) return adapter

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

  return adapter
}


/** Convert data from user input to storage type */
export function setAdapterFromType<D extends Definition>
  ({ type, isArray, isBitmap }: Pick<D, 'type'|'isArray'|'isBitmap'>): D['setAdapter']
{
  let adapter: ((v: any) => any) | undefined;
  if (isBitmap) return adapter

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

  return adapter
}


// TYPE HELPERS

type Sanitized<T extends SchemaBase, Schema extends SchemaBase, DBSchema extends SchemaBase> = Pick<T, (keyof Schema | keyof SanitModel<Schema, DBSchema>['arrays']) & keyof T>
type SanitModel<Schema extends SchemaBase, DBSchema extends SchemaBase> = Partial<Pick<ModelBase<Schema, DBSchema>,'schema'|'arrays'>>