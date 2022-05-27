const logger = require('../config/log.adapter')

function setLogging(req, res, next) {
  // Log request
  logger.info('REQ:',req.method,req.originalUrl,{ ...req.body })

  // Ignore render calls
  res.renderOrig = res.render
  res.isRender = false
  res.render = (...args) => {
    res.isRender = true
    return res.renderOrig(...args)
  }

  // Log response
  res.sendNoLog = res.send
  res.send = (...args) => { 
    logger.info('RES:',res.statusCode,req.originalUrl,
      ...(res.isRender ? ['<RENDERED VIEW>'] : args).map(a =>
        typeof a !== 'object' || a.error ? a :
        Array.isArray(a) ? `ARRAY[${a.length}]` :
        Object.keys(a).map(k => (a[k] ? '' : '!') + k)
      )
    )
    return res.sendNoLog(...args)
  }

  // Bypass CORS -- TO DO: Add CORS
  res.setHeader('Access-Control-Allow-Origin','*')
  return next()
}

module.exports = setLogging
// module.exports = require('morgan')(process.env.MORGAN_FMT || 'dev'),