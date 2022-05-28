const { checkSchema } = require('express-validator')
const logger = require('../config/log.adapter')
const checkValidation = require('../middleware/validate.middleware')
const { getSchemaFromCfg } = require('../services/validate.services')
const { filterDupes } = require('../utils/validate.utils')
const validCfg = require('../config/validation')

// Validate by config/validation[route]
//  params/body are [...keys]|{ inKey: validKey }|'all'|falsy
//  optionalBody = make all body keys optional, unless body key is in params
//  also removes any keys in params from body
exports.byRoute = (route) => (params, body = [], optionalBody = false) => 
  checkSchema(getSchemaAdapter(route, { params, body }, optionalBody))
    .concat(checkValidation)
  


// HELPER -- Retrieve validation schema for route based on route & keys
function getSchemaAdapter(route, keys, optionalBody) {

  // 'all' instead of key array will include validation for all entries
  Object.keys(keys).forEach(t => {
    if (keys[t] === 'all') {
      keys[t] = Object.keys(validCfg.types[route])
    }
  })

  // Build list of keys (combining unique)
  let keyList = {}, keysDict = {}
  Object.keys(keys).forEach(inType => {
    if (!keys[inType]) return

    if (typeof keys[inType] !== 'object') keys[inType] = [keys[inType]]
    else if (!Array.isArray(keys[inType])) {
      keysDict = { ...keysDict, ...keys[inType] }
      keys[inType] = filterDupes(Object.values(keys[inType]))
    }

    keys[inType].forEach((key) => {
      if(keyList[key]) keyList[key].push(inType)
      else keyList[key] = [inType]
    })
  })

  // Call getValidation on each entry in keyList to create validationSchema
  const schema = Object.entries(keyList).reduce((valid, [key, isIn]) =>
    Object.assign(valid,
      getSchemaFromCfg(route, key, isIn, optionalBody)
    ),
  {})
  if (!Object.keys(keysDict).length) return schema

  // Re-Assign validation names based on input
  let renamedSchema = {}, missing = Object.keys(schema)
  Object.entries(keysDict).forEach((([newKey, oldKey]) => {
    if (newKey in renamedSchema)
      return logger.warn(`Duplicate validation schema ID in ${route}: ${oldKey} =/=> ${newKey}`)
    
    renamedSchema[newKey] = schema[oldKey]

    const oldIdx = missing.indexOf(oldKey)
    if (oldIdx >= 0) missing.splice(oldIdx, 1)
  }))

  // Copy any missed schema
  missing.forEach((key) => { renamedSchema[key] = schema[key] })
  return renamedSchema
}