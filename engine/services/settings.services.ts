import type { NestedObjectValue } from '../types/global.d'
import type { EnvObject, SettingsDefinitions } from '../types/settings.d'
import { writeFile, readFile } from 'fs/promises'
import { parse } from 'dotenv'
import logger from '../libs/log'
import { getSettingsVars, stringifyEnv, filterOutProps, getChanged, createEscapeObject } from '../utils/settings.utils'
import { debounce } from '../utils/common.utils'
import { definitions, fileReadDebounceMs, escapeEnvMsg } from '../config/settings.cfg'
import { envPath } from '../config/meta'
import { SessionData } from '../types/Users'


const escapeChars = createEscapeObject(
  (char: string, idx: number, val: string) => { logger.warn(escapeEnvMsg(char,idx,val)) }
)

const [ debouncedRead, forceNextRead ] = debounce(readFile, { interval: fileReadDebounceMs, ignoreArgs: true })


export const settingsDefaults = filterOutProps(
  Object.entries(definitions).reduce(
    (defs, [key, val]) =>
      'formDefault' in val ? { ...defs, [key]: val.formDefault } :
      'default' in val ? { ...defs, [key]: val.default } :
        defs,
      {} as NestedObjectValue<typeof definitions, 'formDefault'|'default'>
  ),
  Object.keys(definitions).filter((key) => definitions[key].html && definitions[key].html.readonly)
)


export const canUndo = (session?: SessionData) => Boolean(
  session && Array.isArray(session.undoSettings) && session.undoSettings.length
)


export async function getSettings() {
  const envObj = await debouncedRead(envPath).then((text) => parse(text.toString()))
  return getSettingsVars(Object.keys(definitions), envObj)
}


export async function setSettings(settings: Partial<EnvObject>, session?: SessionData) {
  const oldSettings = await getSettings()

  if (session) {
    const changes = getChanged(oldSettings, settings)

    if (!Object.keys(changes).length) return
    session.undoSettings = (session.undoSettings || []).concat(changes)
  }
  forceNextRead()
  return writeFile(envPath, stringifyEnv({ ...oldSettings, ...escapeChars(settings) }))
}


export async function getForm() {
  const newForm: Partial<SettingsDefinitions>[] = [{}, {}],
    currentVals = await getSettings(),
    splitForm = Math.ceil(Object.keys(definitions).length / 2)

  Object.keys(definitions).forEach((key, idx) => {
    if (!definitions[key].html) return

    if (Array.isArray(definitions[key].html.type)) {
      const valList = definitions[key].html.type as string[],
        currentVal = String(currentVals[key])

      if (currentVal && !valList.includes(currentVal)) valList.push(currentVal)
    }

    newForm[+(idx >= splitForm)][key] = definitions[key]
  })
  return newForm
}
