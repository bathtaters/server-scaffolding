const validateTypes = require('../config/constants/validation.cfg').types
const { getTypeArray } = require('./validate.utils')

exports.sanitizeSchemaData = (data, schema=null) => Object.keys(data).reduce((obj,key) =>
  !schema || Object.keys(schema).includes(key) ? Object.assign(obj, { [key.toLowerCase()]: data[key] }) : obj
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