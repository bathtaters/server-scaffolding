const { rateLimit } = require('express-rate-limit')
const { dirname } = require('path')
const RateLimitStore = require('../libs/rateLimitStore')
const { dbPath } = require('../config/meta')
const { rateLimits } = require('../config/server.cfg')
const errors = require('../config/errors.engine')
const logger = require('../libs/log')

const storeOptions = {
  dir: process.env.NODE_ENV !== 'test' && dirname(dbPath),
  db: process.env.NODE_ENV === 'test' ? ':memory:' : 'sessions.db',
}

const stores = {
  gui:   new RateLimitStore({ ...storeOptions, table: 'guiRate' }),
  api:   new RateLimitStore({ ...storeOptions, table: 'apiRate' }),
  login: new RateLimitStore({ ...storeOptions, table: 'loginRate' }),
}

const handler = (req, res, next) => next(errors.rateLimit(req.rateLimit))

module.exports = {
  apiLimiter: rateLimit({
    store: stores.api,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    ...rateLimits.api,
  }),
  guiLimiter: rateLimit({
    store: stores.gui,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    ...rateLimits.gui,
  }),
  loginLimiter: rateLimit({
    store: stores.login,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    ...rateLimits.login,
  }),
  isInitialized: Promise.all(Object.values(stores).map(({ promise }) => promise)),
}

module.exports.isInitialized.then(() => logger.verbose('Connected to rate limiter database'))