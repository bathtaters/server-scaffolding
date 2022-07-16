const { connect, disconnect, list, restart } = require('../utils/pm2.promises')
const logger = require('../config/log')
const { name } = require('../../config/meta')
const { terminateServer } = require('../services/init.services')

function restartInstance({ pm_id, pid, pm2_env }, updateEnv = false, isSelf = false) {
  process.env.NODE_APP_INSTANCE = pm2_env.NODE_APP_INSTANCE

  logger.verbose(`Closing instance ${process.env.NODE_APP_INSTANCE} [${pm_id} ${pid}]${isSelf ? ' (self)' : ''}`)
  return restart(pm_id, updateEnv)
}

async function restartWithEnv(env) {
  // Update process.env for restart
  Object.entries(env).forEach(([key,val]) => { process.env[key] = val })
  
  // Store current process info
  let self
  const currentInstance = +process.env.NODE_APP_INSTANCE

  // Restart each process that has the same name
  for (const proc of await list()) {
    if (proc.name !== name) continue
    if (+proc.pm2_env.NODE_APP_INSTANCE === currentInstance) {
      self = proc
      continue
    }
    await restartInstance(proc, true)
  }

  // Restart self
  await terminateServer()
  return self && restartInstance(self, true, true)
}

exports.restartCluster = (withEnv) => connect().then(() => restartWithEnv(withEnv)).finally(disconnect)