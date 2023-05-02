import type { IfExistsBehavior } from '../types/db.d'
import { childLabel } from '../types/Model'
import { getChildName, CONCAT_DELIM, SQL_ID, ifExistsBehavior } from '../config/models.cfg'
import { illegalKeyName, illegalKeys } from '../config/validate.cfg'
import { sqlInjection } from '../config/errors.engine'


export const checkInjection = <T = any>(val: T, tableName = ''): T => {
  if (!val) return val
  
  if (Array.isArray(val)) val.forEach((v) => checkInjection(v, tableName))
  else if (typeof val === 'object') Object.keys(val).forEach((v) => checkInjection(v, tableName))
  else if (typeof val !== 'string' || illegalKeyName.test(val)) throw sqlInjection(val, false, tableName)
  else if (illegalKeys.includes(val.toUpperCase())) throw sqlInjection(val, true, tableName)

  return val
}


export const extractId = <O extends Record<string|number,any>, ID extends keyof O>
  (data: O, idKey: ID): [O[ID], Partial<O>] => {
    const id = data[idKey]
    delete data[idKey]
    return [id, data]
  }


const sortAlgo = (a: number, b: number) => a - b
export const appendAndSort = (array: number[], value: number) => array.includes(value) ?
  array.slice().sort(sortAlgo) :
  array.concat(value).sort(sortAlgo)


export const combineSQL = (sql: Array<[string, any[]] | undefined>) =>
  sql.reduce<[string, any[]]>(
    (combo, entry) => entry ? [

      `${combo[0]}; ${entry[0]}`,
      [ ...combo[1], ...entry[1]  ]

    ] : combo,
    ['', []]
  )


type ArrID = string | number | string[] | number[]

export const getArrayJoin = (
  table: string, primaryId: string, children: string[] = [],
  { id, idKey, idIsArray }: { id?: ArrID, idKey?: string, idIsArray?: boolean } = {}

) => !children.length ?

  `SELECT ${primaryId === SQL_ID ? 'rowid, ' : ''}* FROM ${table}${id == null ? '' : ` WHERE ${idKey || primaryId} = ?`}` :

  `SELECT ${primaryId === SQL_ID ? `${table}.rowid, ` : ''}${[`${table}.*`].concat(children.map((key) => `_children.${key}`)).join(', ')}
    FROM ${table} LEFT JOIN (
      SELECT ${[childLabel.foreignId as string].concat(children.map((key) => `GROUP_CONCAT(${table}_${key}, '${CONCAT_DELIM}') ${key}`)).join(', ')} FROM (${
        children.map((key) => `SELECT ${[childLabel.foreignId, childLabel.index as string].concat(children.map((subKey) =>
          `${key === subKey ? childLabel.value : 'NULL'} AS ${table}_${subKey}`
        )).join(', ')} FROM ${getChildName(table, key)}`).join(`
        UNION ALL
        `)
      }
      ORDER BY ${[childLabel.foreignId, childLabel.index].join(', ')})
    GROUP BY ${childLabel.foreignId}) _children ON _children.${childLabel.foreignId} = ${table}.${primaryId}
    ${id == null ? '' :
    `WHERE ${!idIsArray || Array.isArray(id) ? idKey || primaryId : primaryId} = ${!idIsArray || Array.isArray(id) ? '?' : 
    `(SELECT ${childLabel.foreignId} FROM ${getChildName(table, idKey || primaryId)} WHERE ${childLabel.value} = ?)`}`
  }`


// Tests models.cfg values for SQL injection
if (/['\s]/.test(CONCAT_DELIM)) throw sqlInjection(CONCAT_DELIM, false, 'models.cfg:CONCAT_DELIM')
checkInjection(Object.values(childLabel), 'models.cfg:childLabel')



// SQL Generators

export const countSQL = (tableName: string, whereParams: [string, any][] = []): [string, any[]] => [

  `SELECT COUNT(*) as count FROM ${tableName}${
    whereParams.length ? ` WHERE ${whereParams.map((sql) => sql[0]).join(' AND ')}` : ''
  }`,

  whereParams.map((params) => params[1])
]


export const selectSQL = (
  tableName: string, primaryId: string, whereParams: [string, any][], arrayTables: string[] = [],
  orderBy?: string, desc = false, limit = 0, page = 0,
): [string, any[]] => [

  `${getArrayJoin(tableName, primaryId, arrayTables)
  } ${
    whereParams.length ? 'WHERE ' : ''}${whereParams.map((sql) => sql[0]).join(' AND ')
  }${
    !orderBy ? '' : ` ORDER BY ${tableName}.${orderBy || primaryId} ${desc ? 'DESC' : 'ASC'}`
  }${
    limit ? ' LIMIT ? OFFSET ?' : ''
  }`,

  [ ...whereParams.map((params) => params[1]), ...(limit ? [limit, page * limit] : []) ]
]


export const insertSQL = <T>(
  tableName: string, dataArray: T[], keys: (keyof T)[],
  ifExists: IfExistsBehavior = 'default'
): [string, any[]] => [

  `INSERT${ifExistsBehavior[ifExists]} INTO ${tableName}(${
      keys.join(',')
    }) VALUES ${
      dataArray.map(() => `(${keys.map(() => '?').join(',')})`).join(',')
  }`,

  dataArray.flatMap((data) => keys.map((key) => data[key]))
]

export const updateSQL = <K extends string>(
  tableName: string, updateData: Record<K,any>,
  updateKeys: K[], whereObject: Record<string,any>
): [string, any[]] => {

  const whereKeys = Object.keys(whereObject)

  return [
    `UPDATE ${tableName} SET ${
      updateKeys.map(k => `${k} = ?`).join(',')
    } WHERE ${
      whereKeys.map((k) => `${k} = ?`).join(' AND ')
    }`,

    [ ...updateKeys.map((k) => updateData[k]), ...whereKeys.map((k) => whereObject[k]) ]
  ]
}


export const deleteSQL = (tableName: string, idColumn: string, idList: any[]): [string, any[]] => [
  `DELETE FROM ${tableName} WHERE ${idColumn} ${
    idList.length > 1 ? 'IN' : '='
  } (${
    idList.map(() => '?').join(',')
  })`,

  idList
]


export const swapSQL = (tableName: string, idColumn: string, idA: any, idB: any, tmpID: any): [string, any[]][] => [
  [
    `UPDATE ${tableName} SET ${idColumn} = ? WHERE ${idColumn} = ?;`,
    [tmpID, idA]
  ],[
    `UPDATE ${tableName} SET ${idColumn} = ? WHERE ${idColumn} = ?;`,
    [idA,   idB]
  ],[
    `UPDATE ${tableName} SET ${idColumn} = ? WHERE ${idColumn} = ?;`,
    [idB, tmpID]
  ]
]
