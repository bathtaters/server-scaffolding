const httpErrs = require('http-errors')
const logger = require('../config/log')
const errors = require('../config/errors.internal')
const { access } = require('../config/users.cfg')
const { hasAccess } = require('../utils/users.utils')
const { varName } = require('../utils/gui.utils')
const defaultError = errors.unknown()

// Error string formatting
const getName = (err) => err.name    || (err.status && err.status in httpErrs ? httpErrs[err.status].name : 'Error')
const getMsg  = (err) => err.message || defaultError.message
const getCode = (err) => err.status  || defaultError.status
const formatErr = (err) => err.stack || `${err.name} <${err.status}>: ${err.message}`

// Error Middleware Stack
const catchMissing = (req,res,next) => req.error ? next(req.error) : next(errors.missing())

function normalizeError(err, req, res, next) {
  if (!req.error) req.error = err || defaultError
  if (typeof req.error === 'string') req.error = { message: req.error }
  
  req.error.name    = getName(req.error)
  req.error.message = getMsg(req.error)
  req.error.status  = getCode(req.error)
  
  logger.error(`${req.method} ${req.originalUrl} - ${formatErr(req.error)}`)

  res.status(req.error.status)

  return next()
}

const sendAsJSON = (req, res) => res.send({ error: req.error.message })

const sendAsPage = (req, res) => res.render('error', {
  title: 'Error',
  user: req.user && req.user.username,
  isAdmin: req.user && hasAccess(req.user.access, access.admin),
  showStack: process.env.NODE_ENV === 'development',
  header: varName(req.error.name).trim(),
  error: req.error,
})


module.exports = {
  json: [ catchMissing, normalizeError, sendAsJSON ],
  page: [ catchMissing, normalizeError, sendAsPage ],
}