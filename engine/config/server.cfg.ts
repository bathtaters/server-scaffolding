import type { ProcessEnvValue } from "../types/process.d"
import type { GracefulExitConfig } from "../types/server"
import { definitions } from './settings.cfg'
import { logLevels } from "../types/log"

const isTest = process.env.NODE_ENV === 'test'

// Enable/Disable SSL/TLS
const productionIsSecure = true
export const useLocalCert = process.env.NODE_ENV === 'secure-dev'


export const
isCluster = false, // Forced off because cluster mode not working
processCount = 6,
trustProxy = isTest || decodeTrustProxy(process.env.TRUST_PROXY),
isSecure = !isTest && (process.env.NODE_ENV === 'production' ? productionIsSecure : useLocalCert),
csrfEnable = !isTest && true,
preflightCors = { origin: '*' }, 

gracefulExitOptions: GracefulExitConfig = {
  suicideTimeout: 4000,
  log: true,
  logger: logLevels.verbose,
  performLastRequest: true,
  errorDuringExit: true,
},

sessionCookie = 'sessionID',
sessionFile = 'sessions.db',
sessionTable = 'sessions',
concurrentDB: 'true'|'false' = 'true', // enables WAL journal mode for Sessions

// How often (in ms) erase outdated entries from rate limiter DB
cleanupRateLimiter = 6 * 60 * 60 * 1000, // 6 hrs

rateLimits = {
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
closeEvents = ['SIGINT', 'SIGTERM', 'SIGUSR1', 'SIGUSR2'] as const,
errorEvents = ['uncaughtException', 'unhandledRejection'] as const




//  HELPER -- Sanitize trust proxy value

function decodeTrustProxy(val: ProcessEnvValue = definitions.TRUST_PROXY.default) {
  if (typeof val !== 'string') return val
  if (!isNaN(+val)) return +val
  if (val.includes(',')) return val.split(/\s*,\s*/)

  const lower = val.toLowerCase()
  if (lower === 'true') return true
  if (lower === 'false') return false
  return val
}