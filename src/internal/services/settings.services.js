const { parse } = require('dotenv')
const { exec } = require('child_process')
const { writeFile } = require('fs/promises')
const { getEnvVars, stringifyEnv } = require('../utils/settings.utils')
const { deepUnescape } = require('../utils/validate.utils')
const { defaults } = require('../config/env.cfg')
const { noUndo } = require('../config/errors.internal')
const { envPath } = require('../../config/meta')

const envDefaults = { ...defaults, DB_DIR: '', LOG_DIR: '' }

let envHistory = [getEnvVars(Object.keys(envDefaults))]

const writeCurrent = () => writeFile(envPath, exports.getEnv())

exports.getEnv = () => envHistory.length < 1 ? '' : stringifyEnv(envHistory[envHistory.length - 1])

exports.canUndo = () => envHistory.length > 1

exports.settingsActions = {
  Update:  (text) => {
    const envObj = parse(deepUnescape(text))
    envHistory.push(envObj)
    return writeCurrent()
  },

  Undo:    () => {
    if (!exports.canUndo()) throw noUndo()
    envHistory.pop()
    return writeCurrent()
  },

  Default: () => exports.settingsActions.Update(stringifyEnv(envDefaults)),
  
  Restart: async () => {
    // Restart nodemon
    if (process.env.NODE_ENV === 'development') exec(`touch "${__filename}"`)
    // Restart pm2
    else {
      process.exitCode = 1
      process.emit('SIGUSR1')
    }
    return true
  },
}