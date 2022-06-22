const updateRootPath = (rootPath) => {
  module.exports.defaults.DB_DIR  = module.exports.defaults.DB_DIR.replace(/^\.\//, rootPath + '/')
  module.exports.defaults.LOG_DIR = module.exports.defaults.LOG_DIR.replace(/^\.\//, rootPath + '/')
}

module.exports = {
  updateRootPath,
  restartTimeout: 3,

  defaults: {
    NODE_ENV: 'development',
    port: '8080',
    LOG_CONSOLE: 'info',
    LOG_FILE: 'warn',
    LOG_HTTP: 'common',
    SESSION_SECRET: 'secret',
    DB_DIR: './.db',
    LOG_DIR: './.logs',
  },
}