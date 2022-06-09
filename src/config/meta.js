const join = require('path').join
const pkg = require('../../package.json')
const cdnUrls = require('./constants/cdn.urls')
const pkgCfg = pkg.config || {}
const dbDir = process.env.DB_DIR ||  __dirname
const protectedPrefix = 'admin'

module.exports = {
  name: pkg.name || 'Untitled',
  version: pkg.version || '0',
  port: process.env.port || +pkgCfg.port || 8080,
  rootPath: join(__dirname,'..','..'), // Update if this file moves
  dbPath: join(dbDir, 'database.db'),
  dbDir,
  protectedPrefix,
  urls: {
    ...cdnUrls,
    base: '/dashboard/',
    logout: '/users/logout/',
    users: '/users/',
    login: '/login/',
  },
}