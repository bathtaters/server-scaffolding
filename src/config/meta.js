const join = require('path').join
const pkg = require('../../package.json')
const pkgCfg = pkg.config || {}

const rootPath = join(__dirname,'..','..') // Update if this file moves

module.exports = {
  name: pkg.name || 'untitled',
  version: pkg.version || '0',
  releaseYear: 2022,

  author: pkg.author.name || pkg.author || 'Unknown',
  license: `https://opensource.org/licenses/${pkg.license || 'BSD-2-Clause'}`,
  repoLink: pkg.repository && pkg.repository.url,

  port: process.env.port || +pkgCfg.port || 8080,
  rootPath,
  dbPath:  join(process.env.DB_DIR  || join(rootPath, '.db'),   'database.db'),
  logPath: join(process.env.LOG_DIR || join(rootPath, '.logs'), `${pkg.name || 'server'}_%DATE%.log`),
}