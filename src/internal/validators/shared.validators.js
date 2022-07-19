const { checkSchema } = require('express-validator')
const checkValidation = require('../middleware/validate.middleware')
const { getSchemaFromCfg, getSchema } = require('../services/validate.services')
const { filterDupes } = require('../utils/common.utils')
const validCfg = require('../../config/models.cfg')
const logger = require('../libs/log')

// Validate by config/validation[route]
//  params/body are [...keys]|{ inKey: validKey }|'all'|falsy
//  optionalBody = make all body keys optional, unless body key is in params
//  additional = [{ key: 'name', typeStr: 'int?', in: ['body','params',etc], limits: { min, max, etc } }, ...]
//  also removes any keys in params from body
exports.byRoute = (route) => (params, body = [], optionalBody = false, bodyIsQuery = false, allowPartialSearch = false, additional = null) => 
  checkSchema(getSchemaAdapter(route, { params, [bodyIsQuery ? 'query' : 'body']: body }, optionalBody, allowPartialSearch, additional))
    .concat(checkValidation)

exports.additionalOnly = (additional) => checkSchema(appendAdditional({}, additional)).concat(checkValidation)


// HELPER -- Retrieve validation schema for route based on route & keys
function getSchemaAdapter(route, keys, optionalBodyQry, disableMin, additional) {

  // 'all' instead of key array will include validation for all entries
  Object.keys(keys).forEach(t => {
    if (keys[t] === 'all') {
      keys[t] = Object.keys(validCfg.types[route])
    }
  })

  // Build list of keys (combining unique)
  let keyList = {}, keysDict = {}
  Object.keys(keys).forEach((inType) => {
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
      getSchemaFromCfg(route, key, isIn, optionalBodyQry, disableMin)
    ),
  {})
  if (!Object.keys(keysDict).length) return appendAdditional(schema, additional)

  // Re-Assign validation names based on input
  let renamedSchema = {}, missing = Object.keys(schema)
  Object.entries(keysDict).forEach((([newKey, oldKey]) => {
    renamedSchema[newKey] = schema[oldKey]

    const oldIdx = missing.indexOf(oldKey)
    if (oldIdx >= 0) missing.splice(oldIdx, 1)
  }))

  // Copy any missed schema
  missing.forEach((key) => { renamedSchema[key] = schema[key] })
  
  // Append 'additional' schema
  return appendAdditional(renamedSchema, additional)
}

// HELPER -- Build & Append additional validation to schema
function appendAdditional(schema, additional) {
  if (additional) additional.forEach(({ key, typeStr, isIn, limits }) => {
    // Check 'isIn' value
    if (!isIn) return logger.warn('Missing "isIn" from additional validator schema')
    if (!Array.isArray(isIn)) isIn = [isIn]

    // If key already exists, just add missing 'in' values
    if (key in schema) return isIn.forEach((entry) => schema[key].in.includes(entry) || schema[key].in.push(entry))

    // Append to schema
    Object.entries(getSchema(key, typeStr, limits, isIn)).forEach(([key,val]) => schema[key] = val)
  })

  return schema
}