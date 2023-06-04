// Unlock any user by username
// Command: npm run unlock-user {username}
const disabled = false // for security, flip to enable

import logger from '../libs/log'
import Users from '../models/Users'

const username = process.argv[2]

async function main(): Promise<number> {
  if (disabled) {
    logger.error('This module has been disabled.')
    return -1
  }

  if (!username) {
    logger.error('Must provide username as first arg.')
    return 1
  }

  let exitCode = 0
  try {
    await Users.isInitialized
    await Users.incFailCount({ username }, { reset: true, idKey: 'username' })
  } catch (err) {
    logger.error(`Unable to unlock ${username}.`)
    logger.error(err)
    exitCode = 2
  }

  if (!exitCode) logger.info(`User ${username} has been unlocked.`)
  return exitCode
}

main().then(async (code) => {
  logger.verbose(`Exiting with code: ${code}`)
  process.exit(code)
})