const { gracefulExitHandler } = require('express-graceful-exit')
const logger = require('../config/log.adapter')
const meta = require('../config/meta')
const shutdownError = require('../config/constants/error.messages').shutdown
const { varName } = require('../utils/gui.utils')
const { footer } = require('../config/constants/gui.cfg')
const { getDb, openDb, closeDb } = require('../config/db')
const { closeAll } = require('./log.services')
const models = require('../models/_all')

let isClosing = false

async function initializeServer(server) {
  // Handle terminate
  const handleClose = () => {
    if (isClosing) return
    isClosing = true
    return gracefulExitHandler(server, listener, gracefulExitOptions)
  }
  const handleError = (err) => {
    logger.error('Unhandled Error:', err || 'Unknown error')
    return handleClose()
  }
  process.on('SIGINT',  handleClose)
  process.on('SIGTERM', handleClose)
  process.on('uncaughtException', handleError)
  process.on('unhandledRejection', handleError)
  
  // Setup view vars
  server.locals.footerData = footer
  server.locals.varName = varName
  server.locals.urls = {}
  Object.entries(meta.urls).forEach(([name, url]) => {
    server.locals.urls[name] = typeof url === 'string' ? '/' + meta.protectedPrefix + url : url
  })

  // Setup DB & init Models
  if (!getDb()) await openDb()
  await Promise.all(Object.values(models).map((m) => m.isInitialized))

  logger.info(`${meta.name} services started`)
  
  // Open port
  const listener = server.listen(meta.port, () => logger.info(`Listening on port ${meta.port}`))
}


async function terminateServer() {
  if (getDb()) await closeDb()

  logger.info(`${meta.name} services ended`)

  return closeAll().then(() => console.log('Closed log files'))
}


const gracefulExitOptions = {
  log: true,
  logger: logger.info,
  performLastRequest: true,
  errorDuringExit: true,
  callback: terminateServer,
  getRejectionError: shutdownError,
}

module.exports = initializeServer