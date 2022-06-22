const { gracefulExitHandler } = require('express-graceful-exit')
const { startup, teardown } = require('../../server.init')
const logger = require('../config/log')
const meta = require('../../config/meta')
const urls = require('../../config/urls.cfg')
const shutdownError = require('../config/errors.internal').shutdown
const { varName } = require('../utils/gui.utils')
const { title, footer } = require('../../config/gui.cfg')
const { getDb, openDb, closeDb } = require('../config/db')
const models = require('../../models/_all')

let isClosing = false

async function initializeServer(server) {
  // Handle terminate
  let listener
  const handleClose = () => {
    if (isClosing) return
    isClosing = true
    logger.info(`Shutting down server`)
    if (!listener) return terminateServer().then(() => process.exit(0))
    return gracefulExitHandler(server, listener, gracefulExitOptions)
  }
  const handleError = (err) => {
    logger.error(err || 'Unknown', { label: 'unhandled' })
    if (isClosing) return process.exit(-1)
    return handleClose()
  }
  process.on('SIGINT',  handleClose)
  process.on('SIGTERM', handleClose)
  process.on('SIGUSR1', terminateServer)
  process.on('SIGUSR2', handleClose)
  process.on('uncaughtException',  handleError)
  process.on('unhandledRejection', handleError)
  
  // Setup view vars
  server.locals.appTitle = title
  server.locals.footerData = footer
  server.locals.varName = varName
  server.locals.urls = urls

  // Setup DB & init Models
  if (!getDb()) await openDb()
  await Promise.all(Object.values(models).map((m) => m.isInitialized))

  if (startup) await startup(server)

  logger.info(`${meta.name} services started`)
  
  // Open port
  listener = server.listen(meta.port, () => logger.info(`Listening on port ${meta.port}`))
}


async function terminateServer() {
  if (!isClosing) logger.info(`Shutting down server`)

  if (teardown) await teardown()

  if (getDb()) await closeDb()

  logger.info(`${meta.name} services ended`)

  if (!isClosing) process.exit()
}


const gracefulExitOptions = {
  log: true,
  logger: logger.verbose.bind(logger),
  performLastRequest: true,
  errorDuringExit: true,
  callback: terminateServer,
  getRejectionError: shutdownError,
}

module.exports = initializeServer