const { writeFile, readFile } = require('fs/promises')
const { parse } = require('dotenv')
const logger = require('../libs/log')
const { getSettingsVars, stringifyEnv, filterOutProps, getChanged, escapeSettings } = require('../utils/settings.utils')
const { debounce } = require('../utils/common.utils')
const { definitions, fileReadDebounceMs, escapeEnvMsg } = require('../config/settings.cfg')
const { envPath } = require('../config/meta')

const [ debouncedRead, forceNextRead ] = debounce(readFile, { interval: fileReadDebounceMs, ignoreArgs: true })

exports.settingsDefaults = filterOutProps(
  Object.entries(definitions).reduce((defs, [key,val]) => 'formDefault' in val ? Object.assign(defs, { [key]: val.formDefault }) :
    'default' in val ? Object.assign(defs, { [key]: val.default }) : defs, {}),
  Object.keys(definitions).filter((key) => definitions[key].html && definitions[key].html.readonly)
)

exports.getSettings = async () => {
  const envObj = await debouncedRead(envPath).then((text) => parse(text.toString()))
  return getSettingsVars(Object.keys(definitions), envObj)
}
  
const escapeChars = escapeSettings((...args) => { logger.warn(escapeEnvMsg(...args)) })
exports.setSettings = async (settings, session) => {
  const oldSettings = await exports.getSettings()

  if (session) {
    const changes = getChanged(oldSettings, settings)

    if (!Object.keys(changes).length) return
    session.undoSettings = (session.undoSettings || []).concat(changes)
  }
  forceNextRead()
  return writeFile(envPath, stringifyEnv({ ...oldSettings, ...escapeChars(settings) }))
}

exports.canUndo = (session) => session && Array.isArray(session.undoSettings) && session.undoSettings.length

exports.getForm = async () => {
  const newForm = [{}, {}],
    currentVals = await exports.getSettings(),
    splitForm = Math.ceil(Object.keys(definitions).length / 2)

  Object.keys(definitions).forEach((key, idx) => {
    if (!definitions[key].html) return
    if (Array.isArray(definitions[key].html.type)) {
      const currentVal = typeof currentVals[key] === 'string' ? currentVals[key] : String(currentVals[key])
      if (currentVal && !definitions[key].html.type.includes(currentVal)) 
        definitions[key].html.type.push(currentVal)
    }
    newForm[+(idx >= splitForm)][key] = definitions[key]
  })
  return newForm
}