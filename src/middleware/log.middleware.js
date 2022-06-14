const randomKey = require('crypto').randomUUID
const requestLogger = require('morgan')
const logger = require('../config/log.adapter')
const { protectedPrefix } = require('../config/meta')
const { openFile } = require('../services/log.services')
const { decodeBuffer } = require('../utils/log.utils')

const logDefs = { console: 'short', file: 'common' }

const enableDebugLog = Object.values(logger.logLevel).some((level) => typeof level === 'number' ? level > 4 : level === 'debug')
if (enableDebugLog) logger.debug('Verbose request/response logging enabled')

function logMiddleware(server) {
  if (enableDebugLog) server.use(debugLog)
  else server.use(requestLogger(process.env.MORGAN_CONSOLE || logDefs.console))
  server.use('/api',                requestLogger(process.env.MORGAN_FILE || logDefs.file, { stream: openFile('api') }))
  server.use(`/${protectedPrefix}`, requestLogger(process.env.MORGAN_FILE || logDefs.file, { stream: openFile(protectedPrefix) }))
}


const debugLog = (req, res, next) => {
  if (enableDebugLog) {
    /* REQUEST */
    const start = new Date().getTime(), txId = randomKey()
    const { method, params, body, user, headers, ips, ip } = req
    const url = `${req.protocol}://${req.subdomains.concat('').join('.')}${req.hostname}${req.originalUrl}`
    // const cookies = (req.session ? [{ type: 'session', ...req.session.cookie }] : []).concat(req.cookies || []).concat(req.signedCookies || [])
    const cookies = req.session.cookie
    logger.debug('REQUEST:', method, url, { txId, headers, params, body: { ...body }, cookies, user, ips: ips.concat(ip) })

    /* RESPONSE */
    res.noLogEnd = res.end
    res.end = (data, enc) => {
      const headers = { ...res.getHeaders() }
      const decoded = decodeBuffer(res.get('content-type'), data, enc)
      const timeMs = new Date().getTime() - start
      logger.debug('RESPONSE:', method, url, { txId, headers, timeMs, status: res.statusCode, data: decoded })
      return res.noLogEnd(data, enc)
    }
  }
  next()
}

module.exports = logMiddleware