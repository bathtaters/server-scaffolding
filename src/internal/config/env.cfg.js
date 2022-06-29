const updateRootPath = (rootPath) => {
  module.exports.defaults.DB_DIR  = module.exports.defaults.DB_DIR.replace( /^\.\//, rootPath + '/')
  module.exports.defaults.LOG_DIR = module.exports.defaults.LOG_DIR.replace(/^\.\//, rootPath + '/')
  module.exports.tooltips.DB_DIR  = module.exports.tooltips.DB_DIR.replace( /%PATH%/g, module.exports.defaults.DB_DIR)
  module.exports.tooltips.LOG_DIR = module.exports.tooltips.LOG_DIR.replace(/%PATH%/g, module.exports.defaults.LOG_DIR)
}

module.exports = {
  updateRootPath,
  restartTimeout: 3,
  maxCharCount: 1024,

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

  formSettings: {
    NODE_ENV: { type: ['development','production','test'] },
    port: { type: 'number', limits: { min: 1024, max: 49151 } },
    LOG_CONSOLE: { type: ['verbose','http','info','warn','error','none'] },
    LOG_FILE: { type: ['verbose','http','info','warn','error','none'] },
    LOG_HTTP: { type: ['debug','combined','common','dev','short','tiny','none'] },
    SESSION_SECRET: { type: 'text', limits: { min: 4, max: 2048 } },
    DB_DIR:  { type: 'text', limits: { min: 0, max: 2048 } },
    LOG_DIR: { type: 'text', limits: { min: 0, max: 2048 } },
  },

  tooltips: {
    NODE_ENV: 'Server environment',
    port: 'Server listen port',
    LOG_CONSOLE: 'Log level for printing to console',
    LOG_FILE: 'Log level for saving to log file',
    LOG_HTTP: 'Log format for HTTP logging (Uses Morgan)',
    SESSION_SECRET: 'Secret phrase to encode user sessions (Changing will logout all users)',
    DB_DIR:  'Path to database files (Nothing = [project folder]/.db)',
    LOG_DIR: 'Path to log files (Nothing = [project folder]/.logs)',
  },
}