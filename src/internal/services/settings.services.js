const { exec } = require('child_process')
const { writeFile } = require('fs/promises')
const { getEnvVars, stringifyEnv } = require('../utils/settings.utils')
const { deepUnescape } = require('../utils/validate.utils')
const { defaults, formSettings } = require('../config/env.cfg')
const { noUndo } = require('../config/errors.internal')
const { envPath } = require('../../config/meta')

const envDefaults = { ...defaults, DB_DIR: '', LOG_DIR: '' }

let envHistory = [getEnvVars(Object.keys(envDefaults))]

// Disable persistence when testing
const writeCurrent = process.env.NODE_ENV === 'test' ? () => Promise.resolve() : () => writeFile(envPath, stringifyEnv(exports.getEnv()))

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
  
  Restart: async (envObj) => {
    if (envObj) await exports.settingsActions.Update(envObj)

    switch(process.env.NODE_ENV) {
      case 'test': return 'RESTART'

      case 'development':
        // Restart nodemon
        exec(`touch "${__filename}"`)
        break

      case 'production':
      default:
        // Restart pm2
        process.exitCode = 1
        process.emit('SIGUSR1')
    }
    return true
  },
}