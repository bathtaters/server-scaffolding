const { exec } = require('child_process')
const { writeFile, readFile } = require('fs/promises')
const { parse } = require('dotenv')
const { getEnvVars, stringifyEnv, filterOutProps } = require('../utils/settings.utils')
const { deepUnescape } = require('../utils/validate.utils')
const { restartCluster } = require('../services/pm2.services')
const { defaults, formSettings } = require('../config/env.cfg')
const { noUndo } = require('../config/errors.internal')
const { envPath, isPm2 } = require('../../config/meta')

const envDefaults = filterOutProps(
  { ...defaults, DB_DIR: '', LOG_DIR: '' },
  Object.entries(formSettings).filter(([_, { readonly }]) => readonly).map(([key]) => key)
)

// Disable persistence when testing
const writeEnv = process.env.NODE_ENV === 'test' ? () => Promise.resolve() : (envObj) => writeFile(envPath, stringifyEnv(envObj))

exports.getEnv = () => readFile(envPath).then((val) => getEnvVars(Object.keys(formSettings), parse(val.toString())))

exports.canUndo = () => false

exports.getForm = async () => {
  const newForm = [{}, {}],
    currentVals = await exports.getEnv(),
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
  Update:  async (envObj) => {
    const oldObj = await exports.getEnv()
    return writeEnv({ ...oldObj, ...deepUnescape(envObj) })
  },

  Undo:    () => { throw new Error('UNDO DISABLED') },

  Default: () => exports.settingsActions.Update(envDefaults),
  
  Restart: async (envObj) => {
    if (envObj) await exports.settingsActions.Update(envObj)

    if (process.env.NODE_ENV === 'test') throw new Error('Triggered restart in test environment')
    
    // Restart anything monitoring file changes
    if (!isPm2) return () => exec(`touch "${__filename}"`)

    const env = await exports.getEnv()
    return () => restartCluster(env)
  },
}