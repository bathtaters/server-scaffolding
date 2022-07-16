const { join } = require('path')
const env = require('../internal/config/env.cfg')
const pkg = require('../../package.json')
const pkgCfg = pkg.config || {}

// Set Project Path (NOTE: Update if this file moves!)
const rootPath = join(__dirname,'..','..')
env.updateRootPath(rootPath)

// Load .ENV file
const envPath = join(rootPath, '.env')
require('dotenv').config({ path: envPath })

// Determine port
function getPort() {
  if (process.env.NODE_ENV === 'test') return require('../internal/testing/test.cfg').port
  return (+process.env.port || +pkgCfg.port || 8080) + (
    isNaN(process.env.NODE_APP_INSTANCE) ? 0 : +process.env.NODE_APP_INSTANCE
  )
}

module.exports = {
  name: pkg.name || 'untitled',
  version: pkg.version || '0',
  releaseYear: 2022,

  author: pkg.author.name || pkg.author || 'Unknown',
  license: `https://opensource.org/licenses/${pkg.license || 'BSD-2-Clause'}`,
  repoLink: pkg.repository && pkg.repository.url,

  port: getPort(),
  isPm2: 'NODE_APP_INSTANCE' in process.env,
  rootPath, envPath,
  dbPath:  join(process.env.DB_DIR  || env.defaults.DB_DIR,  'database.db'),
  logPath: join(process.env.LOG_DIR || env.defaults.LOG_DIR, `${pkg.name || 'server'}_%DATE%.log`),
}