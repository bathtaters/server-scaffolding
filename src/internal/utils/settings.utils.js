const { defaults } = require('../config/env.cfg')

exports.getEnvVars = (keys) => keys.reduce((obj, key) => Object.assign(obj, { [key]: key in process.env ? process.env[key] : defaults[key] }), {})

exports.stringifyEnv = (envObj) => Object.entries(envObj).reduce((text, [key,val]) => `${text}${key}=${val}\n`, '')