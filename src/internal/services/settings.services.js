const { writeFile, readFile } = require('fs/promises')
const { parse } = require('dotenv')
const { getEnvVars, stringifyEnv, filterOutProps, getChanged } = require('../utils/settings.utils')
const { defaults, formDefaults, formSettings } = require('../config/env.cfg')
const { envPath } = require('../../config/meta')

exports.envDefaults = filterOutProps(
  { ...defaults, ...formDefaults },
  Object.entries(formSettings).filter(([_, { readonly }]) => readonly).map(([key]) => key)
)

exports.setEnv = async (envObj, session) => {
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