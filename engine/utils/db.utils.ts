import type { AllOps, IfExistsBehavior, SQLParams, UpdateData, WhereLogic } from '../types/db.d'
import { allOps, updateOps, whereLogic } from '../types/db'
import { childLabel } from '../types/Model'
import RegEx from '../libs/regex'
import logger from '../libs/log'
import { getChildName, CONCAT_DELIM, SQL_ID, ifExistsBehavior } from '../config/models.cfg'
import { illegalKeyName, illegalKeys } from '../config/validate.cfg'
import { sqlInjection } from '../config/errors.engine'
import { isIn } from './common.utils'

export const titleQuotes = RegEx(/^\[[^\]]+\]$/)

export const checkInjection = <T = any>(val: T, tableName = ''): T => {
  if (!val) return val
  
  if (Array.isArray(val)) val.forEach((v) => checkInjection(v, tableName))
  else if (typeof val === 'object') Object.keys(val).forEach((v) => checkInjection(v, tableName))
  else if (typeof val !== 'string' || illegalKeyName.test(val)) throw sqlInjection(val, false, tableName)
  else if (illegalKeys.includes(val.toUpperCase())) throw sqlInjection(val, true, tableName)

  return val
}

// Tests models.cfg values for SQL injection
if (RegEx(/['\s]/).test(CONCAT_DELIM)) throw sqlInjection(CONCAT_DELIM, false, 'models.cfg:CONCAT_DELIM')
checkInjection(Object.values(childLabel), 'models.cfg:childLabel')


/** Determine which Operation (if any) is being used on the data */
export const getOpType = <T>(data: T) => typeof data !== 'object' || !data ? undefined :
  allOps.find((key) => key in data) as AllOps


const sortAlgo = (a: number, b: number) => a - b
export const appendAndSort = (array: number[], value: number) => array.includes(value) ?
  array.slice().sort(sortAlgo) :
  array.concat(value).sort(sortAlgo)

  

// Useful Generators

export function whereClause(whereParams: SQLParams, starting: 'WHERE' | 'WHEN' = 'WHERE') {
  
  const whereArray = (params: SQLParams): string[] => params.reduce<string[]>(
    (sql, param) => {
      if (0 in param) return param[0] ? sql.concat(param[0]) : sql
    
      for (const [logic, paramArr] of Object.entries(param)) {
        if (paramArr) {
          const nestedArr = whereArray(paramArr)
          if (nestedArr.length)
            return sql.concat(`(${nestedArr.join(` ${whereLogic[logic as WhereLogic]} `)})`)
        }
      }
      return sql
    }, [])

  const sql = whereArray(whereParams)
  return sql.length ? `${starting} ${sql.join(' AND ')}` : ''
}

export const whereValues = (params: SQLParams): any[] => params.flatMap((param) => {
  if (1 in param) return [param[1]]
  for (const paramArr of Object.values(param)) {
    if (paramArr) return whereValues(paramArr)
  }
  return []
})

const updateParams = (key: string, value: any): [string,any] => {
  if (typeof value === 'object' && value != null && !Array.isArray(value)) {
    for (const [op, paramValue] of Object.entries(value)) {
      const valType = typeof paramValue
  
      if (isIn(valType, updateOps) && isIn(op, updateOps[valType]))
        return [`${key} = ${key} ${updateOps[valType][op]} ?`, paramValue]
    }
  }

  return [`${key} = ?`, value] // Default
}


export const getArrayJoin = (
  table: string, primaryId: string, children: string[] = [],
  { id, idKey, idIsArray }: { id?: ArrID, idKey?: string, idIsArray?: boolean } = {}

) => !children.length ?

  `SELECT ${primaryId === SQL_ID ? 'rowid, ' : ''}* FROM ${table}${
    id == null ? '' : ` WHERE ${idKey || primaryId} = ?`
  }` :

  `SELECT ${primaryId === SQL_ID ? `${table}.rowid, ` : ''}${
    [`${table}.*`].concat(children.map((key) => `_children.${key}`)).join(', ')
  } FROM ${table} LEFT JOIN (\n  SELECT ${
    [
      childLabel.foreignId,
      ...children.map((key) => `GROUP_CONCAT(${table}_${key}, '${CONCAT_DELIM}') ${key}`)
    ].join(', ')
  } FROM (${
    children.map((key) =>
      `\n    SELECT ${[
        childLabel.foreignId, childLabel.index,
        ...children.map((subKey) => `${key === subKey ? childLabel.value : 'NULL'} AS ${table}_${subKey}`)
      ].join(', ')} FROM ${
        getChildName(table, key)
      }`
    ).join(`\n     UNION ALL`)

  }\n    ORDER BY ${
    [childLabel.foreignId, childLabel.index].join(', ')

  }\n  )\n  GROUP BY ${
    childLabel.foreignId

  }\n) _children ON _children.${
    childLabel.foreignId} = ${table}.${primaryId
  }${

    id == null ? '' :
      ` WHERE ${
        !idIsArray || Array.isArray(id) ? idKey || primaryId : primaryId
      } = ${
        !idIsArray || Array.isArray(id) ? '?' : 
          `(SELECT ${childLabel.foreignId} FROM ${
            getChildName(table, idKey || primaryId)
          } WHERE ${childLabel.value} = ?)`
      }`
  }`



// SQL Generators

export const deleteSQL = (tableName: string, whereParams: SQLParams): [string, any[]] => [
  `DELETE FROM ${tableName} ${whereClause(whereParams)}`,
  whereValues(whereParams)
]


export const countSQL = (tableName: string, whereParams: SQLParams): [string, any[]] => [
  `SELECT COUNT(*) as count FROM ${tableName} ${whereClause(whereParams)}`,
  whereValues(whereParams)
]


export const selectSQL = (
  tableName: string, primaryId: string, whereParams: SQLParams, arrayTables: string[] = [],
  orderBy?: string, desc = false, limit = 0, page = 0,
): [string, any[]] => [
  `${
    getArrayJoin(tableName, primaryId, arrayTables)
  } ${
    whereClause(whereParams)
  }${
    orderBy ? ` ORDER BY ${tableName}.${orderBy} ${desc ? 'DESC' : 'ASC'}` : ''
  }${
    limit ? ' LIMIT ? OFFSET ?' : ''
  }`,

  [ ...whereValues(whereParams), ...(limit ? [limit, page * limit] : []) ]
]


export const insertSQL = <T extends object>(
  tableName: string, dataArray: T[], keys: string[],
  ifExists: IfExistsBehavior = 'default'
): [string, any[]] => {
  const dataKeys = keys.filter((key) => dataArray.some((data) => key in data)) as (keyof T)[]
  return [

    `INSERT${ifExistsBehavior[ifExists]} INTO ${tableName}(${
        keys.join(',')
      }) VALUES ${
        dataArray.map(() => `(${dataKeys.map(() => '?').join(',')})`).join(',')
    }`,

    dataArray.flatMap((data) => dataKeys.map((key) => data[key] ?? null))
  ]
}


export const updateSQL = <K extends string>(
  tableName: string, updateData: UpdateData<Record<K,any>>,
  updateKeys: K[],   whereParams: SQLParams,
): [string, any[]] => {
  
  if (!whereParams.length) logger.verbose(`ALERT! Updating ${tableName} table values without WHERE clause.`)

  const updateSql = updateKeys.map((k) => updateParams(k, updateData[k]))

  return [
    `UPDATE ${tableName} SET ${
      updateSql.map(([s]) => s).join(',')
    } ${
      whereClause(whereParams)
    }`,

    [ ...updateSql.map(([_,p]) => p), ...whereValues(whereParams) ]
  ]
}

const singleSQLswap = (table: string, idFrom: any, idTo: any, idKey: string): [string, any[]] => [
  `UPDATE ${table} SET ${idKey} = ? WHERE ${idKey} = ?`,
  [idTo, idFrom]
]

export const swapSQL = 
(table: string, idKey: string, idA: any, idB: any, tmpID: any, children: string[]):
[string, any[]][] => [
  singleSQLswap(table, idA, tmpID, idKey),
  ...children.map((child) => 
    singleSQLswap(getChildName(table, child), idA, tmpID, childLabel.foreignId),
  ),
  
  singleSQLswap(table, idB,   idA, idKey),
  ...children.map((child) => 
    singleSQLswap(getChildName(table, child), idB,   idA, childLabel.foreignId),
  ),
  
  singleSQLswap(table, tmpID, idB, idKey),
  ...children.map((child) => 
    singleSQLswap(getChildName(table, child), tmpID, idB, childLabel.foreignId),
  ),
]


// TYPES

type ArrID = string | number | string[] | number[]