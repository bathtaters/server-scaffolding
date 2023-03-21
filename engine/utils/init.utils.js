const http = require('http')
const https = require('https')
const fs = require('fs/promises')
const { gracefulExitHandler } = require('express-graceful-exit')
const logger = require('../libs/log')
const { shutdown, missingCreds } = require('../config/errors.engine')
const { gracefulExitOptions } = require('../config/server.cfg')


exports.openServer = (app, config, httpsCreds = null) => new Promise((res, rej) => {
  try {
    const server = httpsCreds ? https.createServer(httpsCreds, app) : http.createServer(app)
    if (process.env.NODE_ENV === 'test') return res(server)
    return server.listen(config.port, () => {

      const port = server.address().port
      if (!isNaN(port) && +port !== +config.port) config.port = +port

      return res(server)
    })
  } catch (err) { rej(err) }
})


exports.getCreds = async ({ key, cert }) => {
  let creds = {}
  try {
    if (key)  creds.key  = await fs.readFile(key,  'utf8')
    if (cert) creds.cert = await fs.readFile(cert, 'utf8')
  } catch (err) { logger.error(err) }

  if (!creds.key || !creds.cert) throw missingCreds(process.env.NODE_ENV !== 'production')
  return creds
}


exports.addListeners = (events, handler) => events.forEach((event) => process.on(event, handler))


exports.errorHandler = (proc) => (err) => {
  logger.error(err || 'Unknown', { label: 'unhandled' })
  if (proc.isClosing) return process.exit(-1)
  return exports.closeHandler(proc)()
}

exports.closeHandler = (proc) => () => {
  if (proc.isClosing) return
  proc.isClosing = true
  logger.info(`Shutting down server`)

  if (!proc.listener || !proc.app) return proc.terminateServer().then(() => process.exit(0))

  return gracefulExitHandler(proc.app, proc.listener, {
    ...gracefulExitOptions,
    callback: proc.terminateServer,
    getRejectionError: shutdown,
    logger: logger[gracefulExitOptions.logger || 'verbose'].bind(logger),
  })
}