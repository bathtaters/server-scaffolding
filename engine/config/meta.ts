import type {} from '../types/process.d'
import { config as envConfig } from 'dotenv'
import { join } from 'path'
import { definitions, updateRootPath } from './settings.cfg'
import pkg from '../../package.json'


// Set Project Path (NOTE: Must be updated if this file moves!)
export const rootPath = join(__dirname,'..','..')
export const staticRootPath = rootPath.replace(/\/built$/,'')
updateRootPath(staticRootPath)

// Load .ENV file
export const envPath = join(staticRootPath, '.env')
envConfig({ path: envPath })

// Import configs that depend on process.env
import { isCluster } from './server.cfg'
import { port as testPort } from '../testing/test.cfg'

// Determine listen port
function getPort() {
  if (process.env.NODE_ENV === 'test') return testPort

  const basePort = +(process.env.port || 0) || +((pkg as any).config?.port || 0) || 8080
  if (isCluster || !process.env.NODE_APP_INSTANCE) return basePort

  const portExt = +process.env.NODE_APP_INSTANCE
  return basePort + (isNaN(portExt) ? 0 : portExt)
}


// App Metadata
export const
  name = pkg.name || 'untitled',
  version = pkg.version || '0',
  releaseYear = new Date().getFullYear(),

  author = (pkg.author as any)?.name as string || pkg.author || 'Unknown',
  license = `https://opensource.org/licenses/${pkg.license || 'BSD-2-Clause'}`,
  repoLink = pkg.repository?.url || '',

  port = getPort(),
  isPm2 = process.env.NODE_APP_INSTANCE != null,
  isRootInstance = !!process.env.NODE_APP_INSTANCE && (isNaN(+process.env.NODE_APP_INSTANCE) || !(+process.env.NODE_APP_INSTANCE)),
  dbPath =  join(process.env.DB_DIR  || definitions.DB_DIR.default  || '.',  'database.db'),
  logPath = join(process.env.LOG_DIR || definitions.LOG_DIR.default || '.', `${pkg.name || 'server'}_%DATE%.log`),
  credPath = { key: join(staticRootPath,'.key.pem'), cert: join(staticRootPath,'.cert.pem') }