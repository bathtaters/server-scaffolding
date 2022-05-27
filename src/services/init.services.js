const logger = require('../config/log.adapter')
const meta = require('../config/meta')
const cdnUrls = require('../config/constants/cdn.urls')
const { getDb, openDb } = require('../config/db')
const models = require('../models/all')

async function initServer(server) {
  server.locals.cdn = cdnUrls // Pass to views

  // Setup DB & init Models
  if (!getDb()) await openDb()
  await Promise.all(Object.values(models).map((m) => m.isInitialized))
  
  logger.info(`${meta.name} services started.`)
}

module.exports = initServer