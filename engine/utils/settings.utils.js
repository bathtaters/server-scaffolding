const { definitions, escapeChars } = require('../config/settings.cfg')

exports.getSettingsVars = (keys, envObj = process.env) => keys.reduce((obj, key) => Object.assign(obj, { [key]: key in envObj ? envObj[key] : definitions[key] && definitions[key].default }), {})

exports.stringifyEnv = (envObj) => Object.entries(envObj).reduce((text, [key,val]) => `${text}${key}=${val}\n`, '')

exports.filterOutProps = (obj, hideProps) => {
  hideProps.forEach((prop) => { delete obj[prop] })
  return obj
}

const escaper = (input, callback) => typeof input === 'string' && escapeChars.reduce((escaped, [eschar,replchar]) =>
  !eschar.test(escaped || input) ? escaped :
    (escaped || input).replace(eschar, callback ? (...arg) => callback(...arg) || replchar : replchar).trim()
  , '')
exports.escapeSettings = (callback) => (settings) => Object.entries(settings).forEach(([key,val]) => {
  const newKey = escaper(key, callback), newVal = escaper(val, callback)
  if (newKey || newVal) settings[newKey || key] = newVal || val
  if (newKey) delete settings[key]
  if (!newVal && val && typeof val === 'object') exports.escapeSettings(callback)(val) // recur objects
}) || settings

exports.getChanged = (base, update) => base && update ?
  Object.keys(update).reduce((diff, key) =>
    base[key] == update[key] ? diff :
      Object.assign(diff, { [key]: base[key] })
  , {}) : {}