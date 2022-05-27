const logger = require('../config/log.adapter')

// Error string formatting
const defaultError = require('../config/error.messages').defaultError
const getMsg  = err => (err && err.message) || defaultError.message
const getCode = err => (err && err.status)  || defaultError.status

const formatErr = err => err.stack || `${err.name || 'Error'} <${getCode(err)}>: ${getMsg(err)}`

function handleError(err, req, res, _) {
  if (!req.error) req.error = err
  
  logger.error('Request "'+req.originalUrl+'" encountered:', formatErr(req.error))

  res.status(getCode(req.error))
  return res.sendAndLog({ error: getMsg(req.error) })
}

module.exports = handleError