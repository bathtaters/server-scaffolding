exports.varName = (str) => str === 'id' ? 'ID' :
  str.charAt(0) === '_' ? exports.varName(str.slice(1)) :
  str.replace(/([A-Z])/g, ' $1').replace(/^./, (ltr) => ltr.toUpperCase())

// Get KEYS from schema
exports.getTableFields = (schema) => {
  let keys = Object.keys(schema || {})

  // Move ID to start
  const idIdx = keys.indexOf('id')
  if (idIdx > 0) keys.unshift(keys.splice(idIdx,1)[0])

  return keys.reduce((fields, key) => Object.assign(fields, { [key]: exports.varName(key) }), {})
}

// Convert SQLite data types to HTML input types
const sql2html = [
  [/INTEGER|REAL/i, 'number'],
  [/TEXT|BLOB/i, 'text'],
]

exports.getSchema = (schema) => Object.entries(schema || {}).reduce((res, [key, val]) =>
  key === 'id' ? res : Object.assign(res, {
    // Key = Field Name: Val = input.type OR schemaType if no matches in sql2html
    [key]: (sql2html.find(([re]) => re.test(val)) || {1:val})[1]
  })
, {})

const MASK_CHAR = '*'
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