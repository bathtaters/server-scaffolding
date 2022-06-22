const httpLogger = require('morgan')
const randomKey = require('crypto').randomUUID
const logger = require('../config/log')
const { httpHdr, httpReq, httpRes } = require('../utils/http.utils')
const { httpDebug, silent, httpMessage } = require('../config/log.cfg')

function loadLogMiddleware() {
  // No Middleware
  const httpFormat = process.env.LOG_HTTP || require('../config/env.cfg').defaults.LOG_HTTP
  if (!httpFormat || silent.includes(httpFormat)) return (req,res,next) => next()

  // Normal Middleware
  if (!httpDebug.includes(httpFormat)) {
    logger.verbose(httpMessage(httpFormat))
    return httpLogger(httpFormat, { stream: logger.stream })
  }

  // Debug Middleware
  logger.log(process.env.NODE_ENV === 'production' ? 'warn' : 'info', httpMessage())
  logger.debug = console.debug

  return function debugLogger(req, res, next) {
    /* REQUEST */
    const start = new Date().getTime(), id = randomKey()
    logger.debug(httpHdr(req, 'Request'), httpReq(id, req))
  
    /* RESPONSE */
    res.noLogEnd = res.end
    res.end = (data, enc) => {
      res.noLogEnd(data, enc)
      logger.debug(httpHdr(req, 'Response'), httpRes(id, start, data, enc, res.getHeaders(), res.statusCode))
    }
  
    return next()
  }
}

module.exports = loadLogMiddleware