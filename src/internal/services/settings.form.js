const { exec } = require('child_process')
const { envDefaults, getEnv, setEnv, canUndo } = require('./settings.services')
const { deepUnescape } = require('../utils/validate.utils')
const { restartCluster } = require('./pm2.services')
const errors = require('../config/errors.internal')
const { isPm2 } = require('../../config/meta')


async function getRestartFunc() {
  if (process.env.NODE_ENV === 'test') throw errors.test('Restart triggered in test envrionment')
    
  // Restart anything monitoring file changes
  if (!isPm2) return () => exec(`touch "${__filename}"`)

  const env = await getEnv()
  return () => restartCluster(env)
}


module.exports = {
  Update: (envObj, session) => setEnv(deepUnescape(envObj), session),

  Undo: async (_, session) => {
    if (!canUndo(session)) throw errors.noUndo()
    return setEnv(session.undoSettings.pop())
  },

  Default: (_, session) => setEnv(envDefaults, session),
  
  Restart: async (envObj, session) => {
    if (envObj) await setEnv(deepUnescape(envObj), session)
    return getRestartFunc()
  },
}