const { gracefulExitHandler } = require('express-graceful-exit')
const { startup, teardown } = require('../../server.init')
const logger = require('../libs/log')
const meta = require('../../config/meta')
const urls = require('../../config/urls.cfg')
const shutdownError = require('../config/errors.internal').shutdown
const { varName } = require('../utils/gui.utils')
const { gracefulExitOptions } = require('../config/server.cfg')
const { title, footer } = require('../../config/gui.cfg')
const { getDb, openDb, closeDb } = require('../libs/db')
const models = require('../../models/_all')

let isClosing = false, isTerminating = false

async function initializeServer(server) {
  // Handle terminate
  let listener

  const handleClose = () => {
    if (isClosing) return
    isClosing = true
    logger.info(`Shutting down server`)

    if (!listener) return terminateServer().then(() => process.exit(0))
    return gracefulExitHandler(server, listener, shutdownOptions)
  }

  const handleError = (err) => {
    logger.error(err || 'Unknown', { label: 'unhandled' })
    if (isClosing) return process.exit(-1)
    return handleClose()
  }
  
  process.on('SIGINT',  handleClose)
  process.on('SIGTERM', handleClose)
  process.on('SIGUSR1', handleClose)
  process.on('SIGUSR2', handleClose)
  if (process.env.NODE_ENV === 'development') {
    process.on('uncaughtException',  handleError)
    process.on('unhandledRejection', handleError)
  }
  
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
  if (isTerminating) return
  isTerminating = true

  if (teardown) await teardown()

  if (getDb()) await closeDb()

  logger.info(`${meta.name} services ended`)
}

const shutdownOptions = {
  ...gracefulExitOptions,
  logger: logger[gracefulExitOptions.logger || 'verbose'].bind(logger),
  callback: terminateServer,
  getRejectionError: shutdownError,
}

module.exports = { initializeServer, terminateServer }