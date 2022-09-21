const RegEx = require('../libs/regex')
const { boolOptions } = require('../config/validate.cfg')
const { splitUnenclosed } = require('../utils/common.utils')

// Get validation & limits from html object { key, type, limits }
const html2Valid = ({ type, limits }) => ({
  typeStr: type === 'number' ? 'int' : 'string',
  limits: limits || (Array.isArray(type) && type.length && {
    min: Math.min(...type.map((str) => String(str).length || 0)),
    max: Math.max(...type.map((str) => String(str).length || 0)),
  })
})
exports.formSettingsToValidate = (settings) => Object.entries(settings)
  .reduce((valid, [key, { html }]) => Object.assign(valid, { [key]: html2Valid(html) }), {})

// Boolean validation
const allBools    = boolOptions.true.concat(boolOptions.false)
const boolStrings = boolOptions.true.concat(boolOptions.false).filter((val) => typeof val === 'string').map((val) => val.toLowerCase())
const falseBools  = boolOptions.false.filter((val) => typeof val === 'string').map((val) => val.toLowerCase())
const boolTypes   = boolOptions.types.map((val) => val.toLowerCase()).filter((val) => val !== 'string')

exports.isBoolean = (loose = boolOptions.loose) => !loose ? (val) => allBools.includes(val) :
  (val) => typeof val === 'string' ? boolStrings.includes(val.toLowerCase()) : boolTypes.includes(typeof val)
exports.parseBoolean = (loose = boolOptions.loose) => !loose ? (val) => !boolOptions.false.includes(val) :
  (val) => typeof val === 'string' ? !falseBools.includes(val.toLowerCase()) : Boolean(val)

// Array validation
const arrJson = RegEx(/^\[.*\]$/)
const splitter = splitUnenclosed(',', { trim: true, enclosures: ['{}','[]','""',"''"] })

exports.parseArray = (optional = true) => optional ?
  (str) => Array.isArray(str) ? str : str == null || str === '' ? str : typeof str !== 'string' ? [str] : arrJson.test(str) ? splitter(str.slice(1,str.length-1)) : splitter(str) :
  (str) => Array.isArray(str) ? str : str == null || str === '' ? []  : typeof str !== 'string' ? [str] : arrJson.test(str) ? splitter(str.slice(1,str.length-1)) : splitter(str)

exports.toArraySchema = (schema) => Object.keys(schema).reduce((arrSchema, key) => {
  if ('toArray' in schema[key]) {
    arrSchema[key] = { in: schema[key].in, customSanitizer: { options: exports.parseArray(schema[key].toArray) } }
    if (schema[key].toArray) arrSchema[key].optional = { options: { nullable: true, checkFalsy: true } }
    delete schema[key].toArray
  }
  return arrSchema
}, {})