const logger = require('../config/log.adapter')
const meta = require('../config/meta')
const { varName } = require('../utils/gui.utils')
const { getDb, openDb } = require('../config/db')
const models = require('../models/all')

async function initServer(server) {
  // Setup view vars
  server.locals.varName = varName
  server.locals.urls = {}
  Object.entries(meta.urls).forEach(([name, url]) => {
    server.locals.urls[name] = typeof url === 'string' ? '/' + meta.protectedPrefix + url : url
  })

  // Setup DB & init Models
  if (!getDb()) await openDb()
  await Promise.all(Object.values(models).map((m) => m.isInitialized))
  
  logger.info(`${meta.name} services started.`)
}

module.exports = initServer