import type { ProcessDescription } from 'pm2'
import { connect, list, restart } from '../utils/pm2.promises'
import logger from '../libs/log'
import { name } from '../config/meta'

async function restartInstance({ pm_id, pid, pm2_env }: ProcessDescription, isSelf = false) {
  if (pm2_env != null) process.env.NODE_APP_INSTANCE = (pm2_env as NodeJS.ProcessEnv).NODE_APP_INSTANCE
  
  const current = await list().then((list) => list.find((proc) => proc.pid === pid))

  if (current?.pm_id == null) {
    logger.warn(`Instance ${process.env.NODE_APP_INSTANCE} [${pm_id} ${pid}]${isSelf ? ' (self)' : ''} has already shutdown.`)
    return
  }
  
  logger.verbose(`Closing instance ${process.env.NODE_APP_INSTANCE} [${pm_id} ${pid}]${isSelf ? ' (self)' : ''}`)

  return restart(current.pm_id)
}

async function restartWithEnv(env: Record<string,any>) {
  // Update process.env for restart
  Object.entries(env).forEach(([key,val]) => { process.env[key] = val })
  
  // Store current process info
  let self
  const currentInstance = +(process.env.NODE_APP_INSTANCE || 0)

  // Restart each process that has the same name
  for (const proc of await list()) {
    if (proc.name !== name) continue
    if (+((proc.pm2_env as NodeJS.ProcessEnv)?.NODE_APP_INSTANCE || 0) === currentInstance) {
      self = proc
      continue
    }
    await restartInstance(proc)
  }

  // Restart self
  if (self) await restartInstance(self, true)
}

export async function restartCluster(withEnv: Record<string,any> = {}) {
  await connect()
  await restartWithEnv(withEnv)
}