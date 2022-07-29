const { parseTypeStr, parseBoolean } = require('./validate.utils')
const { isDate } = require('../libs/date')

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

exports.boolsFromTypes = (typeObj) => {
  if (!typeObj) return []
  return Object.keys(typeObj).filter((key) => parseTypeStr(typeObj[key]).type === 'boolean')
}

exports.schemaFromTypes = (typeObj, primaryKey) => {
  if (!typeObj) return {}

  let schema = {}
  Object.entries(typeObj).forEach(([key, type]) => {
    switch(parseTypeStr(type).type || type) {
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
  })

  return schema
}

const toBool = parseBoolean(true)
exports.adaptersFromTypes = (typeObj) => {
  let adapters = { get: {}, set: {} }
  Object.entries(typeObj).forEach(([key,type]) => {
    switch (parseTypeStr(type).type || type) {
      case 'object':
        adapters.set[key] = (obj) => typeof obj === 'object' ? JSON.stringify(obj) : obj
        adapters.get[key] = (text) => JSON.parse(text)
        break
      case 'date':
      case 'datetime':
        adapters.set[key] = (date) => !date ? null :
          typeof date === 'number' ? date : isDate(date) ? date.getTime() : 
            new Date(date).getTime() // Fallback
        adapters.get[key] = (num) => num && new Date(num)
        break
      case 'boolean':
        adapters.set[key] = (bool) => +toBool(bool)
        adapters.get[key] = (int) => int !== 0
        break
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