const { arrayLabel, getArrayName, CONCAT_DELIM, SQL_ID } = require('../config/models.cfg')
const { illegalKeyName, illegalKeys } = require('../config/validate.cfg')
const { sqlInjection } = require('../config/errors.engine')

exports.checkInjection = (val, tableName = '') => {
  if (!val) return val
  if (Array.isArray(val)) return val.map((v) => exports.checkInjection(v, tableName))
  if (typeof val === 'object') Object.keys(val).forEach((v) => exports.checkInjection(v, tableName))
  else if (typeof val !== 'string' || illegalKeyName.test(val)) throw sqlInjection(val, false, tableName)
  else if (illegalKeys.includes(val.toUpperCase())) throw sqlInjection(val, true, tableName)
  return val
}

exports.extractId = (data, idKey) => {
  const id = data[idKey]
  delete data[idKey]
  return [id, data]
}

const sortAlgo = (a,b) => a - b
exports.appendAndSort = (array, value) => array.includes(value) ? array.slice().sort(sortAlgo) : array.concat(value).sort(sortAlgo)


if (/['\s]/.test(CONCAT_DELIM)) throw sqlInjection(CONCAT_DELIM, false, 'models.cfg (CONCAT_DELIM)')
exports.checkInjection(Object.values(arrayLabel), 'models.cfg (arrayLabel)')

exports.getArrayJoin = ({ title, primaryId }, arrays=[], { id, idKey, idIsArray }={}) => !arrays.length ?
  `SELECT ${primaryId === SQL_ID ? 'rowid, ' : ''}* FROM ${title}${id == null ? '' : ` WHERE ${idKey || primaryId} = ?`}`
  :
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