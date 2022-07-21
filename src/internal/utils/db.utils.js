const configTypes = require('../../config/models.cfg').types
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

exports.boolsFromConfig = (modelName) => !configTypes[modelName] ? [] :
  Object.keys(configTypes[modelName]).filter((key) => getTypeArray(configTypes[modelName][key])[1] === 'boolean')

exports.schemaFromConfig = (modelName, primaryKey) => {
  if (!configTypes[modelName]) return

  let schema = {}
  Object.entries(configTypes[modelName]).forEach(([key, val]) => {
    const valType = getTypeArray(val)[1]
    switch(valType) {
      case 'float':
        schema[key] = 'REAL'
        break
      case 'boolean':
      case 'int':
        schema[key] = 'INTEGER'
        break
      default:
        schema[key] = 'TEXT'
    }

    if (key === primaryKey) schema[key] += ' PRIMARY KEY'
  })

  return schema
}