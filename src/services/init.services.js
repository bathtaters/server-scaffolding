const logger = require('../config/log.adapter')
const meta = require('../config/meta')
const models = [ require('../models/Base') ]

async function initServer() {
  if (!db.isOpen()) await db.open()
  await Promise.all(models) // wait for Models to initialize
  logger.info(meta.name+'services started.')
}

module.exports = initServer