const join = require('path').join
const pkg = require('../../package.json')
const urls = require('./constants/urls.cfg')
const pkgCfg = pkg.config || {}

const rootPath = join(__dirname,'..','..') // Update if this file moves
const protectedPrefix = 'admin'
const dbDir = process.env.DB_DIR || join(rootPath, '.db')

module.exports = {
  name: pkg.name || 'Untitled',
  version: pkg.version || '0',
  port: process.env.port || +pkgCfg.port || 8080,
  dbPath: join(dbDir, 'database.db'),
  logDir: process.env.LOG_DIR || join(rootPath, '.logs'),
  rootPath,
  dbDir,
  protectedPrefix,
  urls,
}