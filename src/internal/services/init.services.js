const http = require('http')
const https = require('https')
const fs = require('fs/promises')
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

async function initializeServer(app) {
  // Handle terminate
  let listener

  const handleClose = () => {
    if (isClosing) return
    isClosing = true
    logger.info(`Shutting down server`)

    if (!listener) return terminateServer().then(() => process.exit(0))
    return gracefulExitHandler(app, listener, shutdownOptions)
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
  app.locals.appTitle = title
  app.locals.footerData = footer
  app.locals.varName = varName
  app.locals.urls = urls

  // Setup DB & init Models
  if (!getDb()) await openDb()
  await Promise.all(Object.values(models).map((m) => m.isInitialized))

  if (startup) await startup(app)

  logger.info(`${meta.name} services started`)

  // Get secure credentials
  let creds = {}
  if (meta.isSecure) {
    logger.verbose('Loading secure server credentials')
    try {
      creds.key  = await fs.readFile(meta.credPath.key, 'utf8')
      creds.cert = await fs.readFile(meta.credPath.cert, 'utf8')
    } catch (err) {
      logger.error(err)
    }
    if (!creds.key || !creds.cert) throw new Error(`Unable to read SSL credentials, ${process.env.NODE_ENV === 'development' ? 'try running "npm run dev-cert"' : 'generate SSL/TLS credentials or disable isSecure'}.`) 
  }

  // Open port
  const server = meta.isSecure ? https.createServer(creds, app) : http.createServer(app)
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