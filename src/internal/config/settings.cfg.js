const updateRootPath = (rootPath) => {
  module.exports.defaults.DB_DIR  = module.exports.defaults.DB_DIR.replace( /^\.\//, rootPath + '/')
  module.exports.defaults.LOG_DIR = module.exports.defaults.LOG_DIR.replace(/^\.\//, rootPath + '/')
  module.exports.tooltips.DB_DIR  = module.exports.tooltips.DB_DIR.replace( /%PATH%/g, module.exports.defaults.DB_DIR)
  module.exports.tooltips.LOG_DIR = module.exports.tooltips.LOG_DIR.replace(/%PATH%/g, module.exports.defaults.LOG_DIR)
}

module.exports = {
  updateRootPath,
  restartTimeout: 5,
  fileReadDebounceMs: 3000, // 0 = no debouncing, -1 = only read file after update

  defaults: {
    NODE_ENV: 'development',
    port: '8080',
    LOG_CONSOLE: 'info',
    LOG_FILE: 'warn',
    LOG_HTTP: 'common',
    SESSION_SECRET: 'secret',
    DB_SECRET: 'secret',
    DB_DIR: './.db',
    LOG_DIR: './.logs',
  },

  formSettings: {
    port: { type: 'number', readonly: true, limits: { min: 1024, max: 49151 } },
    NODE_ENV: { type: ['development','production'], limits: { min: 'test'.length, max: 'development'.length } },
    LOG_CONSOLE: { type: ['none', 'error', 'warn', 'info', 'http', 'verbose'] },
    LOG_FILE: { type: ['none', 'error', 'warn', 'info', 'http', 'verbose'] },
    LOG_HTTP: { type: ['none', 'tiny', 'short', 'dev', 'common', 'combined', 'debug'] },
    DB_SECRET: { type: 'password', readonly: true, limits: { min: 4, max: 2048 } },
    SESSION_SECRET: { type: 'password', limits: { min: 4, max: 2048 } },
    DB_DIR:  { type: 'text', limits: { min: 0, max: 2048 } },
    LOG_DIR: { type: 'text', limits: { min: 0, max: 2048 } },
  },

  tooltips: {
    NODE_ENV: 'Server environment',
    port: 'Server listen port (WARNING: Changing can break the site)',
    LOG_CONSOLE: 'Log level for printing to console',
    LOG_FILE: 'Log level for saving to log file',
    LOG_HTTP: 'Log format for HTTP logging (Uses Morgan)',
    SESSION_SECRET: 'Secret phrase for user sessions (Changing will logout all users)',
    DB_SECRET: 'Secret phrase for database (WARNING: Changing requires all dbs/users reset)',
    DB_DIR:  'Path to database files (Nothing = [project folder]/.db)',
    LOG_DIR: 'Path to log files (Nothing = [project folder]/.logs)',
  },

  formDefaults: { DB_DIR: '', LOG_DIR: '' }, // Overrides for settings form
}