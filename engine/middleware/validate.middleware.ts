import type { Middleware } from '../types/express.d'
import { type ErrorFormatter, FieldValidationError, type ValidationError, validationResult } from 'express-validator'
import { mask } from '../utils/gui.utils'
import { guiCfg } from '../src.import'

const formatError: ErrorFormatter<string[]> = (error) => {
  // Extract data for various error types
  let errors =
    error.type === 'field' ? [error] :
    error.type === 'unknown_fields' ? error.fields :
    error.type === 'alternative' ? error.nestedErrors :
    error.type === 'alternative_grouped' ? error.nestedErrors.flat(1) :
      null
  
  if (errors == null)
    // If you see this, check here for new types: https://express-validator.github.io/docs/api/validation-result#validationerror
    throw new Error(`Server error -- Unhandled ValidationError: ${JSON.stringify(error)}`)

  return errors.map(({ path, value }) => 
    `${path} ${error.msg}: ${guiCfg.mask.includes(path) ? mask(value) : JSON.stringify(value)}`
  )
}


/** Test validation middleware (Should be run after all other validators) */
const checkValidation: Middleware = (req, _, next) => {
  const validErrors = validationResult(req)

  if (!validErrors.isEmpty())
    return next({ 
      name: 'ValidationError',
      message: validErrors.formatWith(formatError).array().join(', '),
      stack:
        '\n  Request data:' +
        '\n    URL: ' + req.originalUrl +
        '\n    Method: ' + req.method +                       (req.query  && Object.keys(req.query).length  ? 
        '\n    Queries: ' + JSON.stringify(req.query) : '') + (req.params && Object.keys(req.params).length ? 
        '\n    Params: ' + JSON.stringify(req.params) : '') + (req.body   && Object.keys(req.body).length   ? 
        '\n    Body: ' + JSON.stringify(req.body)     : '') +
        '\n  Validation errors:' +
        '\n    ' + validErrors.formatWith(formatError).array().flat(1).join('\n    '),
      status: 400,
    })
  next()
}

export default checkValidation