import type { ServerInfo, ProcessEvents } from '../types/server.d'
import type { Express } from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs/promises'
import { gracefulExitHandler } from 'express-graceful-exit'
import logger from '../libs/log'
import { invalidPort, shutdown, missingCreds } from '../config/errors.engine'
import { gracefulExitOptions } from '../config/server.cfg'


export function openServer(app: http.RequestListener, config: { port: number }, httpsCreds?: false | https.ServerOptions) {
  return new Promise<http.Server | https.Server>((res) => {
    const server = httpsCreds ? https.createServer(httpsCreds, app) : http.createServer(app)
    if (process.env.NODE_ENV === 'test') return res(server)

    return server.listen(config.port, () => {

      const port = +((server.address() as any)?.port)
      if (!port || isNaN(port)) throw invalidPort(server.address(), config.port)

      config.port = port
      return res(server)
    })
  })
}


export const buildCloseHandler = (app: Express, { isClosing, listener, terminateServer }: ServerInfo) =>
  function closeHandler() {
    if (isClosing) return
    isClosing = true
    logger.info(`Shutting down server`)

    if (!listener || !app) return terminateServer().then(() => process.exit(0))

    return gracefulExitHandler(app, listener, {
      ...gracefulExitOptions,
      callback: terminateServer,
      getRejectionError: shutdown,
      logger: logger[gracefulExitOptions.logger || 'verbose'].bind(logger),
    })
  }


export const addListeners = (events: readonly ProcessEvents[], handler: (...args: any[]) => void) =>
  events.forEach((event) => process.on(event, handler))


export function buildErrorHandler(app: Express, procInfo: ServerInfo) {
  return (err: any) => {
    logger.error(err ? JSON.stringify(err) : 'Unknown', { label: 'unhandled' })
    if (procInfo.isClosing) return process.exit(-1)
    return buildCloseHandler(app, procInfo)()
  }
}


export async function readCerts({ key, cert }: { key?: string, cert?: string }) {
  let creds: { key?: string, cert?: string } = {}
  try {
    if (key)  creds.key  = await fs.readFile(key,  'utf8')
    if (cert) creds.cert = await fs.readFile(cert, 'utf8')
  } catch (err) { logger.error(err) }

  if (!creds.key || !creds.cert) throw missingCreds(process.env.NODE_ENV !== 'production')
  return creds
}
