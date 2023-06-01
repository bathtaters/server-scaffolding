import type { ServerInfo } from '../types/server.d'
import type { Express } from 'express'
import logger from '../libs/log'
import { openServer, readCerts, addListeners, buildCloseHandler, buildErrorHandler } from '../utils/init.utils'
import { getDb, openDb, closeDb } from '../libs/db'
import { varName } from '../utils/gui.utils'
import { isInitialized } from '../middleware/rateLimit.middleware'
import { useLocalCert, closeEvents, errorEvents } from '../config/server.cfg'
import * as meta from '../config/meta'
import { userServer, guiCfg, urlCfg, allModels } from '../src.import'
import { viewMetaKey } from '../types/Model'
import { metaField } from '../types/gui'


let server: ServerInfo = {
  isClosing:     false,
  isTerminating: false,
  listener:      null,
  terminateServer,
}


export default async function initializeServer(app: Express) {

  addListeners(closeEvents, buildCloseHandler(app, server))
  process.env.NODE_ENV !== 'production' && addListeners(errorEvents, buildErrorHandler(app, server))
  
  // Globals
  app.locals.appTitle   = guiCfg.title
  app.locals.footerData = guiCfg.footer
  app.locals.varName  = varName
  app.locals.urls     = urlCfg
  app.locals.metaKey  = viewMetaKey
  app.locals.formKeys = metaField

  // Start services
  if (!getDb()) await openDb()
  await Promise.all(Object.values(allModels).map((m) => m.isInitialized))
  await isInitialized
  await userServer.startup(app)
  logger.info(`${meta.name} services started`)

  // Get secure credentials
  const creds = useLocalCert && await readCerts(meta.credPath).finally(() =>
    logger.verbose('Loaded secure server credentials')
  )

  // Open port
  server.listener = await openServer(app, meta, creds)
  logger.info(`Listening on port ${meta.port}`)
}


async function terminateServer() {
  if (server.isTerminating) return
  server.isTerminating = true

  await userServer.teardown()

  if (getDb()) await closeDb()

  logger.info(`${meta.name} services ended`)
}