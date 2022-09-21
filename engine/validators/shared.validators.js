// byObject() & byModel() can create custom validation middleware

const { checkSchema } = require('express-validator')
const checkValidation = require('../middleware/validate.middleware')
const { generateSchema, appendToSchema } = require('../services/validate.services')
const { adaptSchemaEntry } = require('../services/model.services')
const { toArraySchema } = require('../utils/validate.utils')
const { filterDupes } = require('../utils/common.utils')

const toMiddleware = (validationSchema) => checkSchema(toArraySchema(validationSchema)).concat(checkSchema(validationSchema)).concat(checkValidation)

/**
 * Get validation middleware using custom schema
 * @param {Object.<string, import('../models/Model.engine').ModelDefinition>} schema - Model-type schema
 * @param {string[]} [isIn] - data type in request object (body|params|query)
 * @param {object} [options] - Additional options
 * @param {boolean} [options.forceOptional=false] - force all data to be optional
 * @param {CustomValidation[]} [options.additional=[]] - Additional validation to append to model validation
 * @returns {function[]} Validation Middleware
 */
exports.byObject = (schema, isIn = ['body'], { forceOptional = false, additional = [] } = {}) => toMiddleware(
  appendToSchema({}, Object.entries(schema).map(([key, val]) => ({
    key, isIn, ...adaptSchemaEntry(forceOptional ? { ...val, isOptional: true } : val)
  })).concat(additional))
)

/**
 * Fetch validation middleware using associated Model types & limits (also removes any keys in params from body)
 * @param {object} Model - Model instance to generate validation for
 * @param {object} Model.schema - Object containing Model schema w/ typeStrs (ie. { key: 'string*[]?', ... })
 * @param {Object.<string, Limits>} [Model.limits] - Object containing keys w/ numeric/size limits
 * @param {string[]|object} [body=[]] - Keys in body: [...keyList] OR { inputField: modelKey, ... } OR 'all' (= All keys in types)
 * @param {object} [options] - Additional options
 * @param {string[]|object} [options.params=[]] - Keys in params: [...keyList] OR { inputKey: modelKey, ... } OR 'all' (= All keys in types)
 * @param {boolean} [options.optionalBody=true] - Make all body/query keys optional (params are unaffected) [default: true]
 * @param {boolean} [options.asQueryStr=false] - Move 'body' validation to 'query' (for GET routes) [default: false]
 * @param {boolean} [options.allowPartials=false] - Allow entering less than the minLength for strings (to validate for searches) [default: false]
 * @param {CustomValidation[]} [options.additional] - Additional validation to append to model validation
 * @returns {function[]} Validation Middleware
 */
exports.byModel = function byModel({ schema, primaryId }, body = [], { params = [], optionalBody = true, asQueryStr = false, allowPartials = false, additional } = {}) {
  let keys = { params, [asQueryStr ? 'query' : 'body']: body }

  // 'all' instead of key array will include validation for all entries (w/ HTML field)
  Object.keys(keys).forEach(t => {
    if (keys[t] === 'all') keys[t] = Object.keys(schema).filter(
      (key) => schema[key].html || key === primaryId
    )
  })

  // Build list of keys (combining unique)
  let keyList = {}, keysDict = {}
  Object.keys(keys).forEach((inType) => {
    if (!keys[inType]) return

    if (typeof keys[inType] !== 'object') keys[inType] = [keys[inType]]
    else if (!Array.isArray(keys[inType])) {
      Object.assign(keysDict, keys[inType])
      keys[inType] = filterDupes(Object.values(keys[inType]))
    }

    keys[inType].forEach((key) => {
      keyList[key] = keyList[key] ? keyList[key].concat(inType) : [inType]
    })
  })

  // Call getValidation on each entry in keyList to create validationSchema
  const validationSchema = Object.entries(keyList).reduce((valid, [key, isIn]) =>
    Object.assign(valid,
      generateSchema(
        key, schema[key], isIn,
        optionalBody || key === primaryId || 'default' in schema[key],
        allowPartials
      )
    ),
  {})
  if (!Object.keys(keysDict).length) return toMiddleware(appendToSchema(validationSchema, additional))

  // Re-Assign validation names based on input
  let renamedSchema = {}, missing = Object.keys(validationSchema)
  Object.entries(keysDict).forEach((([newKey, oldKey]) => {
    renamedSchema[newKey] = validationSchema[oldKey]

    const oldIdx = missing.indexOf(oldKey)
    if (oldIdx >= 0) missing.splice(oldIdx, 1)
  }))

  // Copy any missed schema
  missing.forEach((key) => { renamedSchema[key] = validationSchema[key] })
  
  // Append 'additional' schema
  return toMiddleware(appendToSchema(renamedSchema, additional))
}






// JSDOC TYPE DEFINITIONS

/**
 * @typedef Limits
 * @type {Object}
 * @property {number} [min] - minimum value/characters/size
 * @property {number} [max] - maximum value/characters/size
 * @property {Limits} [elem] - limits for array elements
 * @property {Limits} [array] - limits for array length
 */
/**
 * @typedef CustomValidation
 * @type {Object}
 * @property {string} key - name of variable being validated
 * @property {string} typeStr - string of variable type (ie. string*[]?)
 * @property {string[]} isIn - location(s) of variable in HTTP request (ie. ['body','params','query'])
 * @property {Limits} [limits] - numeric/size limits (depending on typeStr)
 */