const validateTypes = require('../../config/models.cfg').types
const { getTypeArray } = require('./validate.utils')

exports.hasDupes = (array) => array.some((val, idx) => array.slice(0, idx).includes(val))

exports.extractId = (data, idKey) => {
  const id = data[idKey]
  delete data[idKey]
  return [id, data]
}

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