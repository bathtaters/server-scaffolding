// Unlock any user by username
// Command: npm run unlock-user {username}
const disabled = true // for security, flip to enable

const logger = require('../libs/log')
const username = process.argv[2]

async function main() {
  if (disabled) return logger.error('This module has been disabled.') || process.exit(-1)

  if (!username) return logger.error('Must provide username as first arg.') || process.exit(1)

  let exitCode = 0
  try {
    const Users = require('../models/Users')
    await Users.isInitialized
    await Users.incFailCount({ username }, { reset: true, idKey: 'username' })
  } catch (err) {
    logger.error(`Unable to unlock ${username}.`)
    logger.error(err)
    exitCode = 2
  } finally {
    await require('../libs/db').closeDb()
  }

  if (!exitCode) logger.info(`User ${username} has been unlocked.`)
  return process.exit(exitCode)
}

main()