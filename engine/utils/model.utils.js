const RegEx = require('../libs/regex')
const { isDate } = require('../libs/date')
const { parseBoolean, parseArray } = require('./validate.utils')
const { arrayLabel, CONCAT_DELIM } = require('../config/models.cfg')

exports.arrayTableRefs = ({ title, primaryId }) => ({
  // Default entry for db.services.reset.refs
  key: arrayLabel.foreignId, table: title, refKey: primaryId,
  onDelete: 'CASCADE', onUpdate: 'CASCADE'
})

// Decode validation types to [type, hasSpaces (*), isArray ([]), isOptional (?)]
const typeStrRegex = RegEx(/^([^[?*]+)(\?|\*|\[\])?(\?|\*|\[\])?(\?|\*|\[\])?$/)
exports.parseTypeStr = (settings, overwrite = false) => {
  if (!settings.typeStr) return settings
  
  const match = settings.typeStr.toLowerCase().match(typeStrRegex)
  if (!match) throw new Error(`Unable to parse typeString: ${settings.typeStr}`)

  const opts = match.slice(2,5)
  if (overwrite || !settings.type)       settings.type       = match[1]
  if (overwrite || !settings.isOptional) settings.isOptional = opts.includes('?')
  if (overwrite || !settings.isArray)    settings.isArray    = opts.includes('[]')
  if (overwrite || !settings.hasSpaces)  settings.hasSpaces  = opts.includes('*')
  return settings
}


exports.isBool = ({ type, isArray }) => type === 'boolean' && !isArray


exports.sanitizeSchemaData = (data, { schema, arrays={} } = {}) => {
  const validKeys = schema && Object.keys(schema).filter((key) => schema[key].db).concat(Object.keys(arrays))
  return Object.keys(data).reduce((obj,key) =>
    !validKeys || validKeys.includes(key) ? Object.assign(obj, { [key]: data[key] }) : obj
  , {})
}


// Convert model type to SQL type
exports.dbFromType = ({ type, isOptional, isPrimary }) => {
  let dbType
  
  switch (type) {
    case 'float':
      dbType = 'REAL'
      break
    case 'boolean':
    case 'date':
    case 'datetime':
    case 'int':
      dbType = 'INTEGER'
      break
    default:
      dbType = 'TEXT'
  }

  if (isPrimary) dbType += ' PRIMARY KEY'
  else if (!isOptional) dbType += ' NOT NULL'

  return dbType
}


// Convert Model type to HTML input type
exports.htmlFromType = ({ type, isArray }) => {
  switch (isArray ? 'array' : type) {
    case 'boolean':   return 'checkbox'
    case 'date':      return 'date'
    case 'datetime':  return 'datetime-local'
    case 'int':
    case 'float':     return 'number'
    default:          return 'text'
  }
}


// Convert data from storage type to expected type
exports.getAdapterFromType = ({ type, isArray, isBitmap }) => {
  let adapter
  if (isBitmap) return adapter

  switch (type) {
    case 'object':
      adapter = (text) => typeof text === 'string' ? JSON.parse(text)    : text
      break
    case 'date':
    case 'datetime':
      adapter = (num) => num && new Date(+num)
      break
    case 'boolean':
      adapter = (int) => int == null ? null : +int !== 0
      break
  }

  if (isArray) {
    const entryGet = adapter
    adapter = entryGet ? 
      (text) => typeof text === 'string' && text ? text.split(CONCAT_DELIM).map(entryGet) :
        Array.isArray(text) ? text.map(entryGet) : null
      : 
      (text) => typeof text === 'string' && text ? text.split(CONCAT_DELIM) :
        Array.isArray(text) ? text : null
  }

  return adapter
}


// Convert data from user input to storage type
const toBool = parseBoolean(true)
const toArray = parseArray(true)
exports.setAdapterFromType = ({ type, isArray, isBitmap }) => {
  let adapter
  if (isBitmap) return adapter

  switch (type) {
    case 'int':
      adapter = (text) => typeof text === 'string' ? parseInt(text)   : text
      break
    case 'float':
      adapter = (text) => typeof text === 'string' ? parseFloat(text) : text
      break
    case 'object':
      adapter = (obj)  => typeof obj  === 'object' && obj ? JSON.stringify(obj) : obj
      break
    case 'date':
    case 'datetime':
      adapter = (date) => typeof date === 'number' ? date :
        !date ? null : isDate(date) ? date.getTime() : 
          !isNaN(date) ? +date : new Date(date).getTime() // Fallback
      break
    case 'boolean':
      adapter = (bool) => bool == null ? bool : +toBool(bool)
      break
  }

  if (isArray) {
    const entrySet = adapter
    adapter = entrySet ?
      (arr) => 
        typeof arr === 'string' ? toArray(arr).map(entrySet) :
        Array.isArray(arr) ? arr.map(entrySet) : null
      :
      (arr) =>
        typeof arr === 'string' ? toArray(arr) :
        Array.isArray(arr) ? arr : null
  }

  return adapter
}