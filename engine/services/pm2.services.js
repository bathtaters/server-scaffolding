const { connect, disconnect, list, restart } = require('../utils/pm2.promises')
const logger = require('../libs/log')
const { name } = require('../config/meta')

async function restartInstance({ pm_id, pid, pm2_env }, isSelf = false) {
  process.env.NODE_APP_INSTANCE = pm2_env.NODE_APP_INSTANCE
  
  const current = await list().then((list) => list.find((proc) => proc.pid === pid))

  if (!current) return logger.warn(`Instance ${pm2_env.NODE_APP_INSTANCE} [${pm_id} ${pid}]${isSelf ? ' (self)' : ''} has already shutdown.`)
  logger.verbose(`Closing instance ${pm2_env.NODE_APP_INSTANCE} [${pm_id} ${pid}]${isSelf ? ' (self)' : ''}`)

  return restart(current.pm_id)
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
    await restartInstance(proc)
  }

  // Restart self
  return self && restartInstance(self, true)
}

exports.restartCluster = (withEnv = {}) => connect().then(() => restartWithEnv(withEnv)).finally(disconnect)