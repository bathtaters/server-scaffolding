const logger = require('../utils/log.adapter')

function setLogging(req, res, next) {
  // Log request
  logger.info('REQ:',req.method,req.originalUrl,req.body)

  // Log response
  res.sendNoLog = res.send
  res.send = (...args) => { 
    logger.info('RES:',res.statusCode,req.originalUrl, ...args.map(a =>
      typeof a !== 'object' || a.error ? a :
      Array.isArray(a) ? `ARRAY[${a.length}]` :
      Object.keys(a).map(k => (a[k] ? '' : '!') + k)
    ))
    return res.sendNoLog(...args)
  }

  // Bypass CORS -- TO DO: Add CORS
  res.setHeader('Access-Control-Allow-Origin','*')
  return next()
}

module.exports = setLogging