const { validationResult } = require('express-validator')
const { mask } = require('../utils/gui.utils')
const masked = require(require('../src.path').config+'gui.cfg').mask || []

const errorFormatter = ({ param, msg, value }) =>  `${param} ${msg}: ${masked.includes(param) ? mask(value) : JSON.stringify(value)}`

// Test validation middleware (Run after running other validators)
const checkValidation = (req, _, next) => {
  const validErrors = validationResult(req)
  if (!validErrors.isEmpty())
    return next({ 
      name: 'ValidationError',
      message: validErrors.formatWith(errorFormatter).array().join(', '),
      stack:
        '\n  Request data:' +
        '\n    URL: ' + req.originalUrl +
        '\n    Method: ' + req.method +                       (req.query  && Object.keys(req.query).length  ? 
        '\n    Queries: ' + JSON.stringify(req.query) : '') + (req.params && Object.keys(req.params).length ? 
        '\n    Params: ' + JSON.stringify(req.params) : '') + (req.body   && Object.keys(req.body).length   ? 
        '\n    Body: ' + JSON.stringify(req.body)     : '') +
        '\n  Validation errors:' +
        '\n    ' + validErrors.formatWith(errorFormatter).array().join('\n    '),
      status: 400,
    })
  next()
}

module.exports = checkValidation