const { getTypeArray } = require('./validate.utils')

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
  return Object.keys(typeObj).filter((key) => getTypeArray(typeObj[key]).type === 'boolean')
}

exports.schemaFromTypes = (typeObj, primaryKey) => {
  if (!typeObj) return {}

  let schema = {}
  Object.entries(typeObj).forEach(([key, val]) => {
    switch(getTypeArray(val).type || val) {
      case 'float':
      case 'real':
        schema[key] = 'REAL'
        break
      case 'boolean':
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