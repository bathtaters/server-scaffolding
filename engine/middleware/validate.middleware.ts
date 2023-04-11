import type { Middleware } from '../types/express'
import { type ErrorFormatter, validationResult } from 'express-validator'
import { mask } from '../utils/gui.utils'
import { guiCfg } from '../src.import'

const formatError: ErrorFormatter<string> = ({ param, msg, value }) => 
  `${param} ${msg}: ${guiCfg.mask.includes(param) ? mask(value) : JSON.stringify(value)}`


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
        '\n    ' + validErrors.formatWith(formatError).array().join('\n    '),
      status: 400,
    })
  next()
}

export default checkValidation