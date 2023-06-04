import type { DefinitionSchema } from '../types/Model.d'
import type { EnvObject } from '../types/settings.d'
import { writeFile, readFile } from 'fs/promises'
import { parse } from 'dotenv'
import logger from '../libs/log'
import { getSettingsVars, stringifyEnv, filterOutProps, getChanged, createEscapeObject } from '../utils/settings.utils'
import { debounce } from '../utils/common.utils'
import { definitions, fileReadDebounceMs, escapeEnvMsg } from '../config/settings.cfg'
import { envPath } from '../config/meta'
import { formEffects } from '../types/gui'

const settingsKeys = Object.keys(definitions) as (keyof typeof definitions)[]

const escapeChars = createEscapeObject(
  (char: string, idx: number, val: string) => { logger.warn(escapeEnvMsg(char,idx,val)) }
)

const [ debouncedRead, forceNextRead ] = debounce(readFile, { interval: fileReadDebounceMs, ignoreArgs: true })


export const settingsDefaults = filterOutProps(
  Object.entries(definitions).reduce(
    (defs, [key, val]) =>
      'default' in val
        ? { ...defs, [key]: val.formEffect === formEffects.hideDefault ? '' : String(val.default) }
        : defs,

      {} as EnvObject
  ),
  settingsKeys.filter((key) => definitions[key].formEffect === formEffects.readonly)
)


export const canUndo = (session?: Express.Request['session']) => Boolean(
  Array.isArray(session?.undoSettings) && session?.undoSettings.length
)


export async function getSettings() {
  const envObj = await debouncedRead(envPath).then((text) => parse(text.toString()))
  return getSettingsVars(settingsKeys, envObj)
}


export async function setSettings(settings: Partial<EnvObject>, session?: UserSessionData) {
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
  const newForm: Partial<DefinitionSchema>[] = [{}, {}],
    currentVals = await getSettings(),
    splitForm = Math.ceil(settingsKeys.length / 2)

  settingsKeys.forEach((key, idx) => {
    if (!definitions[key].html) return

    if (Array.isArray(definitions[key].html)) {
      const valList = definitions[key].html as string[],
        currentVal = String(currentVals[key])

      if (currentVal && !valList.includes(currentVal)) valList.push(currentVal)
    }

    newForm[+(idx >= splitForm)][key] = definitions[key]
  })
  return newForm
}


type UserSessionData = { undoSettings?: Partial<EnvObject>[] }
declare module 'express-session' { interface SessionData extends UserSessionData {} }