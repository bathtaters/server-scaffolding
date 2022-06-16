const randomKey = require('crypto').randomUUID
const requestLogger = require('morgan')
const logger = require('../config/log')
const { openFile } = require('../services/log.services')
const { decodeBuffer, emptyMiddleware } = require('../utils/log.utils')
const { defaultMorgan, autoEnableVerbose, verboseMsg } = require('../config/log.cfg')

function debugLog(req, res, next) {
  if (!enableDebugLog) return next()

  /* REQUEST */
  const start = new Date().getTime(), txId = randomKey()
  const { method, params, body, user, headers, ips, ip } = req
  const url = `${req.protocol}://${req.subdomains.concat('').join('.')}${req.hostname}${req.originalUrl}`
  // const cookies = (req.session ? [{ type: 'session', ...req.session.cookie }] : []).concat(req.cookies || []).concat(req.signedCookies || [])
  const cookies = req.session && req.session.cookie
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

  return next()
}


function getLogMiddleware(route) {
  if (route) {
    if (process.env.REQ_FILE.toLowerCase() === 'none') return emptyMiddleware
    return requestLogger(process.env.REQ_FILE || defaultMorgan.file, { stream: openFile(route.replace(/\//g,'') || 'root') })
  }
  
  if (enableDebugLog) return debugLog
  if (process.env.REQ_CONSOLE.toLowerCase() === 'none') return emptyMiddleware
  else return requestLogger(process.env.REQ_CONSOLE || defaultMorgan.console)
}


const enableDebugLog = autoEnableVerbose(logger.logLevel) && (logger.debug(verboseMsg) || true)

module.exports = getLogMiddleware