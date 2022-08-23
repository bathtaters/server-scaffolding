const logger = require('../libs/log')
const { openServer, getCreds, addListeners, closeHandler, errorHandler } = require('../utils/init.utils')
const { getDb, openDb, closeDb } = require('../libs/db')
const { varName } = require('../utils/gui.utils')
const rateMw = require('../middleware/rateLimit.middleware')

const { config, base, modelsPath } = require('../src.path')
const { useLocalCert, closeEvents, errorEvents } = require('../config/server.cfg')
const { startup, teardown } = require(base+'server.init')
const { title, footer } = require(config+'gui.cfg')
const meta = require('../config/meta')
const urls = require(config+'urls.cfg')
const models = require(modelsPath)

module.exports = {
  isClosing: false,
  isTerminating: false,

  initializeServer: async function initializeServer(app) {
    module.exports.app = app

    addListeners(closeEvents, closeHandler(module.exports))
    process.env.NODE_ENV === 'development' && addListeners(errorEvents, errorHandler(module.exports))
    
    // Globals
    app.locals.appTitle = title
    app.locals.footerData = footer
    app.locals.varName = varName
    app.locals.urls = urls

    // Start services
    if (!getDb()) await openDb()
    await Promise.all(Object.values(models).map((m) => m.isInitialized))
    await rateMw.isInitialized
    if (startup) await startup(app)
    logger.info(`${meta.name} services started`)

    // Get secure credentials
    const creds = useLocalCert && await getCreds(meta.credPath).finally(() =>
      logger.verbose('Loaded secure server credentials')
    )

    // Open port
    module.exports.listener = await openServer(app, meta, creds)
    logger.info(`Listening on port ${meta.port}`)
  },


  terminateServer: async function terminateServer() {
    if (module.exports.isTerminating) return
    module.exports.isTerminating = true

    if (teardown) await teardown()

    if (getDb()) await closeDb()

    logger.info(`${meta.name} services ended`)
  },
}