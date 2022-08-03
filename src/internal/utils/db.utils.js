const { isDate } = require('../libs/date')
const { parseTypeStr, parseBoolean, parseArray } = require('./validate.utils')
const { illegalKeyName } = require('../config/validate.cfg')
const { sqlInjection } = require('../config/errors.internal')

exports.checkInjection = (val, tableName = '') => {
  if (!val) return val
  if (Array.isArray(val)) return val.map((v) => exports.checkInjection(v, tableName))
  if (typeof val === 'object') Object.keys(val).forEach((v) => exports.checkInjection(v, tableName))
  else if (typeof val !== 'string' || illegalKeyName.test(val)) throw sqlInjection(val, tableName)
  return val
}

exports.extractId = (data, idKey) => {
  const id = data[idKey]
  delete data[idKey]
  return [id, data]
}

const sortAlgo = (a,b) => a - b
exports.appendAndSort = (array, value) => array.includes(value) ? array.slice().sort(sortAlgo) : array.concat(value).sort(sortAlgo)

exports.sanitizeSchemaData = (data, schema=null) => {
  const validKeys = schema && Object.keys(schema)
  return Object.keys(data).reduce((obj,key) =>
    !validKeys || validKeys.includes(key) ? Object.assign(obj, { [key]: data[key] }) : obj
  , {})
}

const isNonArrayBool = ({ type, isArray }) => type === 'boolean' && !isArray
exports.boolsFromTypes = (typeObj) => {
  if (!typeObj) return []
  return Object.keys(typeObj).filter((key) => isNonArrayBool(parseTypeStr(typeObj[key])))
}

exports.schemaFromTypes = (typeObj, primaryKey) => {
  if (!typeObj) return {}

  let schema = {}
  Object.entries(typeObj).forEach(([key, type]) => {
    const typeObj = parseTypeStr(type)
    if (typeObj.isArray) typeObj.type = 'array'
    switch (typeObj.type || type) {
      case 'float':
      case 'real':
        schema[key] = 'REAL'
        break
      case 'boolean':
      case 'date':
      case 'datetime':
      case 'int':
      case 'integer':
        schema[key] = 'INTEGER'
        break
      default:
        schema[key] = 'TEXT'
    }

    if (key === primaryKey) schema[key] += ' PRIMARY KEY'
    if (!typeObj.isOptional) schema[key] += ' NOT NULL'
  })

  return schema
}

const toBool = parseBoolean(true)
const toArray = parseArray(true)
exports.adaptersFromTypes = (typeObj) => {
  let adapters = { get: {}, set: {} }
  Object.entries(typeObj).forEach(([key,type]) => {
    const typeObj = parseTypeStr(type)
    switch (typeObj.type || type) {
      case 'integer':
        adapters.set[key] = (text) => typeof text === 'string' ? parseInt(text)   : text
        break
      case 'float':
        adapters.set[key] = (text) => typeof text === 'string' ? parseFloat(text) : text
        break
      case 'object':
        adapters.set[key] = (obj)  => typeof obj  === 'object' ? JSON.stringify(obj) : obj
        adapters.get[key] = (text) => typeof text === 'string' ? JSON.parse(text)    : text
        break
      case 'date':
      case 'datetime':
        adapters.set[key] = (date) => !date ? null :
          typeof date === 'number' ? date : isDate(date) ? date.getTime() : 
            !isNaN(date) ? +date : new Date(date).getTime() // Fallback
        adapters.get[key] = (num) => num && new Date(num)
        break
      case 'boolean':
        adapters.set[key] = (bool) => +toBool(bool)
        adapters.get[key] = (int) => int !== 0
        break
      }

      if (typeObj.isArray) {
        const entrySet = typeObj.type !== 'object' ? adapters.set[key] : adapters.get[key],
          entryGet = typeObj.type !== 'object' && adapters.get[key]
        adapters.set[key] = typeof entrySet === 'function' ?
          (arr) => typeof arr === 'string' ? JSON.stringify(toArray(arr).map(entrySet)) :
            Array.isArray(arr) ? JSON.stringify(arr.map(entrySet)) : null :
          (arr) => typeof arr === 'string' ? JSON.stringify(toArray(arr)) :
            Array.isArray(arr) ? JSON.stringify(arr) : null
        adapters.get[key] = typeof entryGet === 'function' ? 
          (text) => !text ? null : JSON.parse(text).map(entryGet) : 
          (text) => !text ? null : JSON.parse(text)
      }
  })
  return {
    getAdapter: Object.keys(adapters.get).length ? (data) => {
      typeof data === 'object' && Object.keys(data).forEach((key) => {
        if (key in adapters.get) data[key] = adapters.get[key](data[key])
      })
      return data
    } : undefined,
    setAdapter: Object.keys(adapters.set).length ? (data) => {
      typeof data === 'object' && Object.keys(data).forEach((key) => {
        if (key in adapters.set) data[key] = adapters.set[key](data[key])
      })
      return data
    } : undefined,
  }
}