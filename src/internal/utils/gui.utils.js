const { varNameDict, sql2html, MASK_CHAR } = require('../../config/gui.cfg')

exports.varName = (str) =>  typeof str !== 'string' ? str : Object.keys(varNameDict).includes(str) ? varNameDict[str] :
  str.charAt(0) === '_' ? exports.varName(str.slice(1)) :
  str.replace(/([A-Z])/g, ' $1').replace(/^./, (ltr) => ltr.toUpperCase())

// Get KEYS from schema
exports.getTableFields = (schema, idKey) => {
  let keys = Object.keys(schema || {})

  // Move ID to start
  const idIdx = keys.map((k) => k.toLowerCase()).indexOf(idKey.toLowerCase())
  if (idIdx > 0) keys.unshift(keys.splice(idIdx,1)[0])

  const tf = keys.reduce((fields, key) => Object.assign(fields, { [key]: exports.varName(key) }), {})
  return tf
}

// Convert SQLite data types to HTML input types
exports.getSchema = (schema, idKey) => Object.entries(schema || {}).reduce((res, [key, val]) =>
  key.toLowerCase() === idKey.toLowerCase() ? res : Object.assign(res, {
    // Key = Field Name: Val = input.type OR schemaType if no matches in sql2html
    [key]: (sql2html.find(([re]) => re.test(val)) || {1:val})[1]
  })
, {})

exports.mask = (value) => {
  // Recursively mask
  if (Array.isArray(value))
    return value.map(mask)
  if (value && typeof value === 'object')
    return Object.entries(value).reduce((obj,[key,val]) => ({ ...obj, [key]: mask(val) }), {})

  // Mask literals
  switch (typeof value) {
    case 'number':
    case 'bigint': value = value.toString()
    case 'string': return MASK_CHAR.repeat(value.length)
    case 'object':
    case 'undefined': return String(value)
  }
  // Mask others (bool, func, symbol)
  return `[${typeof value}]`
}