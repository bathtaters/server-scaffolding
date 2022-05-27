const { validationResult } = require('express-validator')

const errorFormatter = ({ param, msg, value }) =>  `${param} ${msg}: ${JSON.stringify(value)}`

// Test validation middleware (Run after running other validators)
const checkValidation = (req, _, next) => {
  const validErrors = validationResult(req)
  if (!validErrors.isEmpty())
    next({ 
      message: validErrors.formatWith(errorFormatter).array().join(', '),
      stack:
        '\n  Request data:' +
        '\n    URL: ' + req.originalUrl +
        '\n    Method: ' + req.method +
        '\n    Params: ' + JSON.stringify(req.params) +
        '\n    Body: ' + JSON.stringify(req.body) +
        '\n  Validation errors:' +
        '\n    ' + validErrors.formatWith(errorFormatter).array().join('\n    '),
      status: 400,
    })
  next()
}

module.exports = checkValidation