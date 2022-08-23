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
