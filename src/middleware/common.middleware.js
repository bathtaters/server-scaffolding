const logger = require('../config/log.adapter')
const { deepUnescape } = require('../utils/validate.utils')

// Add deepUnescape to run on send args
const unescapeMiddleware = (_, res, next) => {
  res.sendUnescaped = res.send
  res.send = (...args) => res.sendUnescaped(...deepUnescape(args))
  next()
}

// If enabled, log all IO to logger.debug
const enableDebugLog = typeof logger.logLevel === 'number' ? logger.logLevel > 3 : logger.logLevel === 'debug'

const debugLog = (req, res, next) => {
  if (enableDebugLog) {
    // Log input
    const { method, params, body, user } = req
    const url = `${req.protocol}://${req.subdomains.concat('').join('.')}${req.hostname}${req.originalUrl}`
    const cookies = [ { type: 'session', ...req.session.cookie }, ...(req.cookies || []), ...(req.signedCookies || []) ]
    logger.debug('> REQUEST:', method, url, { params, body: { ...body }, cookies, user })

    // Log output
    res.sendIgnoreLog = res.send
    res.send = (data) => {
      logger.debug('> RESPONSE:', method, url, { status: res.statusCode, cookies: res.cookies, data })
      return res.sendIgnoreLog(data)
    }
  }
  next()
}

module.exports = [debugLog, unescapeMiddleware]