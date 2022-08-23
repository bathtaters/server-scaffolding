// Enable/Disable SSL/TLS
const productionIsSecure = true
const useLocalCert = process.env.NODE_ENV === 'development' && true

const isTest = process.env.NODE_ENV === 'test'
module.exports = {
  isCluster: false, // Cluster mode not working
  processCount: 6,
  trustProxy: isTest || decodeTrustProxy(process.env.TRUST_PROXY || require('./settings.cfg').definitions.TRUST_PROXY.default),
  isSecure: !isTest && (process.env.NODE_ENV === 'production' ? productionIsSecure : useLocalCert),
  csrfEnable: !isTest && true,
  useLocalCert,
  
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

  // Event Listener's
  closeEvents: ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'],
  errorEvents: ['uncaughtException', 'unhandledRejection'],
}

//  HELPER

function decodeTrustProxy(val) {
  if (typeof val !== 'string') return val
  if (!isNaN(val)) return +val
  if (val.includes(',')) return val.split(/\s*,\s*/)
  const lower = val.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  return val
}