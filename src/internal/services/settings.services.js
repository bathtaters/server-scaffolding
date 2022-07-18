const { exec } = require('child_process')
const { writeFile, readFile } = require('fs/promises')
const { parse } = require('dotenv')
const { getEnvVars, stringifyEnv, filterOutProps, getChanged } = require('../utils/settings.utils')
const { deepUnescape } = require('../utils/validate.utils')
const { restartCluster } = require('../services/pm2.services')
const { defaults, formSettings } = require('../config/env.cfg')
const errors = require('../config/errors.internal')
const { envPath, isPm2 } = require('../../config/meta')

const envDefaults = filterOutProps(
  { ...defaults, DB_DIR: '', LOG_DIR: '' },
  Object.entries(formSettings).filter(([_, { readonly }]) => readonly).map(([key]) => key)
)

async function setEnv(envObj, session) {
  const currentEnv = await exports.getEnv()

  if (session) {
    const changes = getChanged(currentEnv, envObj)

    if (!Object.keys(changes).length) return
    session.undoSettings = (session.undoSettings || []).concat(changes)
  }
  return writeFile(envPath, stringifyEnv({ ...currentEnv, ...envObj }))
}

exports.getEnv = () => readFile(envPath).then((val) => getEnvVars(Object.keys(formSettings), parse(val.toString())))

exports.canUndo = (session) => session && Array.isArray(session.undoSettings) && session.undoSettings.length

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
  Update: (envObj, session) => setEnv(deepUnescape(envObj), session),

  Undo: async (_, session) => {
    if (!exports.canUndo(session)) throw errors.noUndo()
    return setEnv(session.undoSettings.pop())
  },

  Default: (_, session) => setEnv(envDefaults, session),
  
  Restart: async (envObj, session) => {
    if (envObj) await setEnv(deepUnescape(envObj), session)

    if (process.env.NODE_ENV === 'test') throw errors.test('Restart triggered in test envrionment')
    
    // Restart anything monitoring file changes
    if (!isPm2) return () => exec(`touch "${__filename}"`)

    const env = await exports.getEnv()
    return () => restartCluster(env)
  },
}