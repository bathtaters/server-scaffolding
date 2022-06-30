const { parse } = require('dotenv')
const { exec } = require('child_process')
const { writeFile } = require('fs/promises')
const { getEnvVars, stringifyEnv } = require('../utils/settings.utils')
const { deepUnescape } = require('../utils/validate.utils')
const { defaults, formSettings } = require('../config/env.cfg')
const { noUndo } = require('../config/errors.internal')
const { envPath } = require('../../config/meta')

const envDefaults = { ...defaults, DB_DIR: '', LOG_DIR: '' }

let envHistory = [getEnvVars(Object.keys(envDefaults))]

const writeCurrent = () => writeFile(envPath, stringifyEnv(exports.getEnv()))

exports.getEnv = () => envHistory.length < 1 ? {} : envHistory[envHistory.length - 1]

exports.canUndo = () => envHistory.length > 1

exports.getForm = () => {
  const newForm = [{}, {}],
    currentVals = exports.getEnv(),
    splitForm = Math.ceil(Object.keys(formSettings).length / 2)

  Object.keys(formSettings).forEach((key, idx) => {
    if (Array.isArray(formSettings[key].type)) {
      const currentVal = typeof currentVals[key] === 'string' ? currentVals[key] : String(currentVals[key])
      if (currentVal && !formSettings[key].type.includes(currentVal)) 
        formSettings[key].type.push(currentVal)
    }
    newForm[+(idx >= splitForm)][key] = formSettings[key]
  })
  return newForm
}

exports.settingsActions = {
  Update:  (envObj) => {
    envHistory.push(deepUnescape(envObj))
    return writeCurrent()
  },

  Undo:    () => {
    if (!exports.canUndo()) throw noUndo()
    envHistory.pop()
    return writeCurrent()
  },

  Default: () => exports.settingsActions.Update(envDefaults),
  
  Restart: (envObj) => exports.settingsActions.Update(envObj).then(() => {
    // Restart nodemon
    if (process.env.NODE_ENV === 'development') exec(`touch "${__filename}"`)
    // Restart pm2
    else {
      process.exitCode = 1
      process.emit('SIGUSR1')
    }
    return true
  }),
}