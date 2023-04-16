import type { SettingsActionFunc, SettingsActions } from '../types/settings.d'
import { exec } from 'child_process'
import { settingsDefaults, getSettings, setSettings, canUndo } from './settings.services'
import { test as testError, noUndo } from '../config/errors.engine'
import { isPm2 } from '../config/meta'
import { restartCluster } from './pm2.services'


async function getRestartFunc() {
  if (process.env.NODE_ENV === 'test') throw testError('Restart triggered in test envrionment')
    
  // Restart anything monitoring file changes
  if (!isPm2) return () => { exec(`touch "${__filename}"`) }

  const env = await getSettings()
  return () => restartCluster(env)
}


const settingsActions: Record<SettingsActions, SettingsActionFunc> = {
  Update: (settings, session) => setSettings(settings, session),

  Default: (_, session) => setSettings(settingsDefaults, session),

  async Undo(_, session) {
    if (!canUndo(session)) throw noUndo()
    return setSettings(session.undoSettings.pop())
  },
  
  async Restart(settings, session) {
    if (settings) await setSettings(settings, session)
    return getRestartFunc()
  },
}


export default settingsActions