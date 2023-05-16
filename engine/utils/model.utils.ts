import type {
  SchemaGeneric, DefType, DefinitionNormal, DefinitionSchema, DBSchemaOf, DBSchemaKeys, 
  DefaultAdapters, DefaultArrayAdapters, AdapterType, ForeignKeyRef,
} from '../types/Model.d'
import type Model from '../models/Model'
import type { GenericModel } from '../models/Model'
import type { IfExistsBehavior, SQLParams, SQLSuffix, SQLType, SQLTypeFull, WhereData, WhereOps } from '../types/db.d'
import type { ValidationBasic, ValidationExpanded } from '../types/validate.d'
import type { HTMLType } from '../types/gui.d'
import { foreignKeyActions, sqlSuffixes, sqlTypes, whereLogic, whereNot, whereOp, whereOpPartial } from '../types/db'
import { adapterTypes, childLabel } from '../types/Model'
import { htmlValidationDict } from '../types/gui'

import RegEx from '../libs/regex'
import { isIn } from './common.utils'
import { insertSQL, deleteSQL } from './db.utils'
import { parseBoolean, parseArray, parseDate, toTypeString, expandTypeStr } from './validate.utils'
import { CONCAT_DELIM, defaultPrimaryType, getChildName } from '../config/models.cfg'

// Initialize Parsers
const toBool = parseBoolean(true)
const toArray = parseArray(true)

/** Convert from Property Definition to Basic Validation */
export const definitionToValid = (def: DefinitionSchema[string], forceOptional = false): ValidationBasic => {
  if (!def.type && !def.isPrimary) throw new Error(`Definition is missing type: ${JSON.stringify(def)}`)

  let val = { ...def, type: def.type || defaultPrimaryType }
  if (forceOptional) val.type = toTypeString({ ...expandTypeStr(val), isOptional: true })
  return val
}

/** Default entry for db.services.reset.refs */
export const childTableRefs = ({ title, primaryId }: Pick<GenericModel,'title'|'primaryId'>): ForeignKeyRef => ({
  key: childLabel.foreignId,
  table: title,
  refKey: primaryId,
  onDelete: foreignKeyActions.Cascade,
  onUpdate: foreignKeyActions.Cascade,
})

/** Split keys from data into Parent & Child lists */
export const splitKeys = (data: Record<string,any>, childSchema: Record<string,any>) => {
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
  tableName: string, childData: T[], childKeys: string[],
  primaryKey: string | number, ifExists: IfExistsBehavior, overwriteChild = false
) => {
  return childKeys.flatMap((key) => {
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
}


const hasNot = RegEx(/^NOT\s/i)
function notParams<P extends SQLParams | SQLParams[number]>(params: P) {
  if (!Array.isArray(params) || typeof params[0] !== 'string')
    Object.values(params).forEach(notParams)
  else
    params[0] = hasNot.test(params[0]) ? params[0].slice(4) : `NOT ${params[0]}`
  return params
}

const inequalities = Object.keys(whereOp).filter((op) => op !== whereOpPartial) as WhereOps[]
export function getSqlParams<Def extends DefinitionSchema>(
  { title, schema, children }: Pick<Model<Def>, 'title'|'schema'|'children'>,
  matchData?: WhereData<DBSchemaOf<Def>>,
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
export const propertyIsChild = <O, P extends keyof any>(arrayOfObjects: O[], property: P) =>
  arrayOfObjects.filter(
    (obj: any) => Array.isArray(obj[property])
  ) as (O & { [property in P]: any[] })[]

export const isDbKey = <Def extends DefinitionSchema>
  (idKey: any, schema: Def): idKey is DBSchemaKeys<Def> =>
    !idKey || Boolean(isIn(idKey, schema) && schema[idKey].db)


export function sanitizeSchemaData
  <Def extends DefinitionSchema, T extends SchemaGeneric>
  (data: T, { schema, children }: SanitModel<Def> = {}): T
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
export const stripPrimaryDef = <S extends DefType>
  ({ db, isOptional, ...definition }: DefinitionNormal<S>) => ({
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
  if (isArray) return htmlValidationDict.default
  return htmlValidationDict[typeBase] ?? htmlValidationDict.default
}


/** Get default AdapterType adapter based on Definition */
export function getDefaultAdapter(adapterType: AdapterType, { typeBase, isArray, isBitmap }: DefinitionNormal) {
  if (isBitmap) return false
  
  let adapter = defaultAdapters[adapterType][typeBase]

  if (isArray) {
    const entryAdapter = adapter
    adapter = arrayAdapters[adapterType](entryAdapter)
  }

  return adapter || false
}



// *** Adapter Library *** \\

const defaultAdapters: DefaultAdapters = {
  [adapterTypes.get]: {
    object:   (text) => typeof text === 'string' ? JSON.parse(text) : text,
    boolean:  (int)  => int == null ? null : +int !== 0,
    datetime: (num)  => num && new Date(+num),
    date:     (num)  => num && new Date(+num),
  },

  [adapterTypes.set]: {
    int:      (text) => typeof text === 'string' ? parseInt(text)   : text,
    float:    (text) => typeof text === 'string' ? parseFloat(text) : text,
    object:   (obj)  => typeof obj  === 'object' && obj ? JSON.stringify(obj) : obj,
    boolean:  (bool) => bool == null ? bool : +toBool(bool),
    datetime: parseDate,
    date:     parseDate,
  },
}


const arrayAdapters: DefaultArrayAdapters = {
  [adapterTypes.get]: (entryAdapter) =>
    entryAdapter ? (text, data) =>
      typeof text === 'string' && text
        ? text.split(CONCAT_DELIM).map((v) => entryAdapter(v, data))
        : Array.isArray(text)
          ? text.map((v) => entryAdapter(v, data))
          : []

    : (text) =>
      typeof text === 'string' && text
        ? text.split(CONCAT_DELIM)
        : Array.isArray(text)
          ? text
          : [],

  [adapterTypes.set]: (entryAdapter) =>
    entryAdapter ? (arr, data) => 
      typeof arr === 'string'
        ? toArray(arr)?.map((v) => entryAdapter(v, data))
        : Array.isArray(arr)
          ? arr.map((v) => entryAdapter(v, data))
          : null
          
    : (arr) =>
      typeof arr === 'string'
        ? toArray(arr)
        : Array.isArray(arr)
          ? arr
          : null,
}


// TYPE HELPERS

type SanitModel<Def extends DefinitionSchema> = Partial<Pick<GenericModel<Def>,'schema'|'children'>>