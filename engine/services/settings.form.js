const { exec } = require('child_process')
const { settingsDefaults, getSettings, setSettings, canUndo } = require('./settings.services')
const errors = require('../config/errors.engine')
const { isPm2 } = require('../config/meta')

const { restartCluster } = isPm2 ? require('./pm2.services') : {}

async function getRestartFunc() {
  if (process.env.NODE_ENV === 'test') throw errors.test('Restart triggered in test envrionment')
    
  // Restart anything monitoring file changes
  if (!isPm2) return () => exec(`touch "${__filename}"`)

  const env = await getSettings()
  return () => restartCluster(env)
}


module.exports = {
  Update: (settings, session) => setSettings(settings, session),

  Undo: async (_, session) => {
    if (!canUndo(session)) throw errors.noUndo()
    return setSettings(session.undoSettings.pop())
  },

  Default: (_, session) => setSettings(settingsDefaults, session),
  
  Restart: async (settings, session) => {
    if (settings) await setSettings(settings, session)
    return getRestartFunc()
  },
}