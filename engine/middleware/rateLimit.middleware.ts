import type { Middleware } from '../types/express'
import { RateLimitInfo, rateLimit } from 'express-rate-limit'
import { dirname } from 'path'
import logger from '../libs/log'
import RateLimitStore from '../libs/rateLimitStore'
import { dbPath } from '../config/meta'
import { rateLimits } from '../config/server.cfg'
import { rateLimit as rateLimitError } from '../config/errors.engine'

const storeOptions = {
  dir: process.env.NODE_ENV !== 'test' ? dirname(dbPath) : undefined,
  db: process.env.NODE_ENV === 'test'  ? ':memory:'      : 'sessions.db',
}

const stores = {
  gui:   new RateLimitStore({ ...storeOptions, table: 'guiRate'   }),
  api:   new RateLimitStore({ ...storeOptions, table: 'apiRate'   }),
  login: new RateLimitStore({ ...storeOptions, table: 'loginRate' }),
}

const handler: Middleware = (req, res, next) => next(rateLimitError(req.rateLimit))

export const apiLimiter = rateLimit({
  store: stores.api,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  ...rateLimits.api,
})
export const guiLimiter = rateLimit({
  store: stores.gui,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  ...rateLimits.gui,
})
export const loginLimiter = rateLimit({
  store: stores.login,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  ...rateLimits.login,
})

export const isInitialized = Promise.all(Object.values(stores).map(({ promise }) => promise))

isInitialized.then(() => logger.verbose('Connected to rate limiter database'))


// Add rateLimit to Request object
declare global {
  namespace Express {
    interface Request {
      rateLimit?: RateLimitInfo;
    }
  }
}