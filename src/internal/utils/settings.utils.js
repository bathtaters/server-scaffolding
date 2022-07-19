const { defaults, replaceEnvChars } = require('../config/settings.cfg')
const { deepMap } = require('../utils/common.utils')

exports.getSettingsVars = (keys, envObj = process.env) => keys.reduce((obj, key) => Object.assign(obj, { [key]: key in envObj ? envObj[key] : defaults[key] }), {})

exports.stringifyEnv = (envObj) => Object.entries(envObj).reduce((text, [key,val]) => `${text}${key}=${val}\n`, '')

exports.filterOutProps = (obj, hideProps) => {
  hideProps.forEach((prop) => { delete obj[prop] })
  return obj
}

const envRegEx = new RegExp(`[${replaceEnvChars[0] || ''}]`, 'g')
exports.deepReplace = (callback) => (input) => !replaceEnvChars[0] ? (input) => input : 
  deepMap(input, (val) =>
    typeof val !== 'string' ? val :
      val.replace(envRegEx, (...args) => callback(...args) || replaceEnvChars[1]).trim()
  )

exports.getChanged = (base, update) => base && update ?
  Object.keys(update).reduce((diff, key) =>
    base[key] == update[key] ? diff :
      Object.assign(diff, { [key]: base[key] })
  , {}) : {}