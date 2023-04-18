import type { Middleware, Next, Request, Response } from '../types/express'
import httpErrs, { type HttpError } from 'http-errors'
import logger from '../libs/log'
import { unknown, missing, noCSRF, noSession } from '../config/errors.engine'
import { access } from '../types/Users'
import { hasAccess } from '../utils/users.access'
import { varName } from '../utils/gui.utils'

const defaultError = unknown()

// Error string formatting
const getName   = (err: HttpError) => err.name    || (httpErrs[err.status] || {}).name || 'Error'
const getMsg    = (err: HttpError) => err.message || defaultError.message
const getCode   = (err: HttpError) => err.status  || defaultError.status
const formatErr = (err: HttpError) => err.stack   || `${err.name} <${err.status}>: ${err.message}`

// Error Middleware Stack
const catchMissing: Middleware = (req, _, next) => req.error ? next(req.error) : next(missing())

function normalizeError(err: HttpError | string | undefined, req: Request, res: Response, next: Next) {
  let error = err || req.error || defaultError

  if (typeof error === 'object' && error.code === 'EBADCSRFTOKEN')
    error = req.session ? noCSRF() : noSession()
  else if (typeof error === 'string')
    error = { name: error, message: error } as HttpError
  
  error.message = getMsg(error)
  error.status  = getCode(error)
  error.name    = getName(error)
  
  logger.error(`${req.method} ${req.originalUrl} - ${formatErr(error)}`)
  res.status(error.status)
  req.error = error

  return next()
}

const sendAsJSON: Middleware = (req, res) => res.send({ error: req.error } as any)

const sendAsHTML: Middleware = (req, res) => res.render('error', {
  title: 'Error',
  user: req.user && req.user.username,
  isAdmin: req.user && hasAccess(req.user.access, access.admin),
  showStack: process.env.NODE_ENV !== 'production',
  header: varName(req.error?.name ?? 'ERROR').trim(),
  error: req.error,
})


export const jsonError = [catchMissing, normalizeError, sendAsJSON]
export const htmlError = [catchMissing, normalizeError, sendAsHTML]


// Add error to Request object
declare global {
  namespace Express {
    interface Request {
      error?: HttpError;
    }
  }
}