const join = require('path').join
const pkg = require('../../package.json')
const pkgCfg = pkg.config || {}

module.exports = {
  name: pkg.name || 'Untitled',
  version: pkg.version || '0',
  protectedPrefix: 'admin',
  port: process.env.port || +pkgCfg.port || 8080,
  apiVersion: (pkg.version || '1').split('.',1)[0],
  rootPath: join(__dirname,'..','..'), // Update if this file moves
  dbPath: join(__dirname,'database.db'), // Update if this file moves
}