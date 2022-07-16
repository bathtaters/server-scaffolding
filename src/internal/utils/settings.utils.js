const { defaults } = require('../config/env.cfg')

exports.getEnvVars = (keys, envObj = process.env) => keys.reduce((obj, key) => Object.assign(obj, { [key]: key in envObj ? envObj[key] : defaults[key] }), {})

exports.stringifyEnv = (envObj) => Object.entries(envObj).reduce((text, [key,val]) => `${text}${key}=${val}\n`, '')

exports.filterOutProps = (obj, hideProps) => {
  hideProps.forEach((prop) => { delete obj[prop] })
  return obj
}