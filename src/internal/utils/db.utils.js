const validateTypes = require('../../config/models.cfg').types
const { getTypeArray } = require('./validate.utils')

exports.extractId = (data, idKey) => {
  const id = data[idKey]
  delete data[idKey]
  return [id, data]
}

const sortAlgo = (a,b) => a - b
exports.appendAndSort = (array, value) => array.includes(value) ? array.slice().sort(sortAlgo) : array.concat(value).sort(sortAlgo)

exports.sanitizeSchemaData = (data, schema=null) => Object.keys(data).reduce((obj,key) =>
  !schema || Object.keys(schema).includes(key) ? Object.assign(obj, { [key]: data[key] }) : obj
, {})

exports.schemaFromValidate = (modelName, idKey) => {
  if (!validateTypes[modelName]) return

  let schema = {}
  Object.entries(validateTypes[modelName]).forEach(([key, val]) => {
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

    if (key === idKey) schema[key] += ' PRIMARY KEY'
  })

  return schema
}