const { checkSchema } = require('express-validator')
const checkValidation = require('../middleware/validate.middleware')
const { getSchemaFromCfg } = require('../services/validate.services')
const validCfg = require('../config/validation')

// Validate by config/validation[route]
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
  const keyList = {}
  Object.keys(keys).forEach(inType => {
    if (!keys[inType]) return

    if (!Array.isArray(keys[inType])) keys[inType] = [keys[inType]]

    keys[inType].forEach(key => {
      if(keyList[key]) keyList[key].push(inType)
      else keyList[key] = [inType]
    })
  })

  // Call getValidation on each entry in keyList to create validationSchema
  return Object.entries(keyList).reduce((valid, [key, isIn]) =>
    Object.assign(valid,
      getSchemaFromCfg(route, key, isIn, optionalBody)
    ),
  {})
}