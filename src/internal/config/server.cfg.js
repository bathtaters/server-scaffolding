module.exports = {
  isCluster: false, // Cluster mode not working
  processCount: 6,
  trustProxy: process.env.NODE_ENV === 'test' || process.env.TRUST_PROXY || require('./settings.cfg').definitions.TRUST_PROXY.default,
  isSecure: process.env.NODE_ENV !== 'test' && (process.env.NODE_ENV === 'production' ? true : true), // enable SSL/TLD
  csrfEnable: process.env.NODE_ENV !== 'test' && true,
  
  gracefulExitOptions: {
    suicideTimeout: 4000,
    log: true,
    logger: 'verbose',
    performLastRequest: true,
    errorDuringExit: true,
  },

  concurrentDB: true, // enables WAL journal mode for Sessions

  // How often (in ms) erase outdated entries from rate limiter DB
  cleanupRateLimiter: 6 * 60 * 60 * 1000, // 6 hrs

  rateLimits: {
    api: {
      max: 100,
      windowMs: 60 * 1000,
    },
    gui: {
      max: 1000,
      windowMs: 60 * 60 * 1000,
    },
    login: {
      max: 100,
      windowMs: 60 * 60 * 1000,
    },
  },
}