const join = require('path').join
const pkg = require('../../package.json')

module.exports = {
  name: pkg.name || 'Untitled',
  version: pkg.version || '0',
  port: process.env.PORT || +pkg.config.port || 8080,
  apiVersion: (pkg.version || '1').split('.',1)[0],
  rootPath: join(__dirname,'..','..'), // Update if this file moves
  dbPath: join(__dirname,'database.db'), // Update if this file moves
}