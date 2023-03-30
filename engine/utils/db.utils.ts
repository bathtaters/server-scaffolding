import { arrayLabel, getArrayName, CONCAT_DELIM, SQL_ID } from '../config/models.cfg'
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


type ArrID = string | number | string[] | number[]

export const getArrayJoin = (
  { title, primaryId }: { title: string, primaryId: string },
  arrays: string[] = [],
  { id, idKey, idIsArray }: { id?: ArrID, idKey?: string, idIsArray?: boolean } = {}

) => !arrays.length ?

  `SELECT ${primaryId === SQL_ID ? 'rowid, ' : ''}* FROM ${title}${id == null ? '' : ` WHERE ${idKey || primaryId} = ?`}` :

  `SELECT ${primaryId === SQL_ID ? `${title}.rowid, ` : ''}${[`${title}.*`].concat(arrays.map((key) => `_arrays.${key}`)).join(', ')}
    FROM ${title} LEFT JOIN (
      SELECT ${[arrayLabel.foreignId].concat(arrays.map((key) => `GROUP_CONCAT(${title}_${key}, '${CONCAT_DELIM}') ${key}`)).join(', ')} FROM (${
        arrays.map((key) => `SELECT ${[arrayLabel.foreignId, arrayLabel.index].concat(arrays.map((subKey) =>
          `${key === subKey ? arrayLabel.entry : 'NULL'} AS ${title}_${subKey}`
        )).join(', ')} FROM ${getArrayName(title, key)}`).join(`
        UNION ALL
        `)
      }
      ORDER BY ${[arrayLabel.foreignId, arrayLabel.index].join(', ')})
    GROUP BY ${arrayLabel.foreignId}) _arrays ON _arrays.${arrayLabel.foreignId} = ${title}.${primaryId}
    ${id == null ? '' :
    `WHERE ${!idIsArray || Array.isArray(id) ? idKey || primaryId : primaryId} = ${!idIsArray || Array.isArray(id) ? '?' : 
    `(SELECT ${arrayLabel.foreignId} FROM ${getArrayName(title, idKey || primaryId)} WHERE ${arrayLabel.entry} = ?)`}`
  }`


// Tests models.cfg values for SQL injection
if (/['\s]/.test(CONCAT_DELIM)) throw sqlInjection(CONCAT_DELIM, false, 'models.cfg:CONCAT_DELIM')
checkInjection(Object.values(arrayLabel), 'models.cfg:arrayLabel')