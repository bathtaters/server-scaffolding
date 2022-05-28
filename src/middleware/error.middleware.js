const logger = require('../config/log.adapter')
const { protectedPrefix } = require('../config/meta')

// Error string formatting
const defaultError = require('../config/constants/error.messages').defaultError
const getMsg  = err => (err && err.message) || defaultError.message
const getCode = err => (err && err.status)  || defaultError.status

const formatErr = err => err.stack || `${err.name || 'Error'} <${getCode(err)}>: ${getMsg(err)}`

function handleError(err, req, res, _) {
  if (!req.error) req.error = err
  
  logger.error(`${new Date().toISOString()}: ${req.originalUrl} - ${formatErr(req.error)}`)

  req.error.status = getCode(req.error)
  res.status(req.error.status)

  // Handle error for View
  if (req.method === 'GET' && req.originalUrl.includes(protectedPrefix))
    return res.render('error', { message: getMsg(req.error), error: req.error })

  // Handle error for API
  return res.send({ error: getMsg(req.error) })
}

module.exports = handleError