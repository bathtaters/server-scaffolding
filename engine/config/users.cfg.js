const RegEx = require('../libs/regex')
const urls = require(require('../src.path').config+'urls.cfg').gui.admin

const access = { api: 1, gui: 2, admin: 4, none: 0 }
const models = { read: 1, write: 2, none: 0 }

const allModelsKey = 'default'

const passwordLimits = { min: 8, max: 128 }

const rateLimiter = { maxFails: 5, failWindow: 10 * 60 * 1000, autoUnlock: false } // !autoUnlock: manual unlock by admin

module.exports = {
  access,
  accessMax: Object.values(access).reduce((sum,n) => sum | n, 0),
  models,
  modelsMax: Object.values(models).reduce((sum,n) => sum | n, 0),
  allModelsKey,
  noModelAccessChar: '-',

  loginAccess: [ 'gui', 'admin' ],
  requirePassword: [ 'gui', 'admin' ],

  tableFields: {
    username: 'Username', access: 'Access', password: 'Password',
    token: 'API Token', cors: 'CORS Origin', models: 'Model Access', 
    guiTime: 'GUI Access', apiTime: 'API Access', failTime: 'Fails',
    locked: 'Locked',
  },
  
  encode: { iters: 1049, keylen: 64, digest: 'sha512' },

  saveLoginMs: 5 * 24 * 60 * 60 * 1000,

  apiToken: { header: "Authorization", matchToken: RegEx(/^Bearer (.+)$/) },

  timestampKeyRegEx: RegEx(/^(.*)Time$/),

  rateLimiter,

  tooltips: {
    password: `Must be at least ${passwordLimits.min} characters.`,
    confirm: 'Must match Password.',
    cors: 'Enter: * (all), true/false (all/none), comma-seperated urls, or RegExp(&quot;<regexp>&quot;).',
    models: 'Set read/write access based on model. No setting for a model uses default setting.',
    locked: 'Lock/Unlock entire user account'
  },

  definitions: {
    id: {
      typeStr: "hex",
      limits: { min: 32, max: 32 },
    },
    username: {
      typeStr: "string",
      default: "user",
      limits: { min: 2, max: 255 },
    },
    password: {
      typeStr: "string?",
      limits: passwordLimits,
      db: false,
    },
    confirm: {
      typeStr: "string?",
      limits: passwordLimits,
      db: false,
      dbOnly: true,
    },
    token: {
      typeStr: "hex",
      default: null,
      limits: { min: 32, max: 32 },
    },
    access: {
      typeStr: "string[]?",
      default: [ 'api', 'gui' ],
      limits: { elem: { max: 16 }, array: { max: Object.keys(access).length } },
      isBitmap: true,
      db: 'INTEGER',
    },
    cors: {
      typeStr: "string*",
      default: '*',
      limits: { min: 0, max: 2048 },
    },
    models: {
      typeStr: "string[]",
      default: { [allModelsKey]: ['read','write'] },
      limits: { elem: { max: 64 }, array: { max: 100 * Object.keys(models).length } },
      db: 'TEXT',
    },
    failCount: {
      typeStr: "int?",
      default: 0,
      limits: { min: 0, max: rateLimiter.maxFails + 1 },
      html: false,
    },
    failTime: {
      typeStr: "datetime?",
      html: false,
    },
    guiCount: {
      typeStr: "int?",
      default: 0,
      limits:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
      html: false,
    },
    guiTime: {
      typeStr: "datetime?",
      html: false,
    },
    apiCount: {
      typeStr: "int?",
      default: 0,
      limits:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
      html: false,
    },
    apiTime: {
      typeStr: "datetime?",
      html: false,
    },
    locked: {
      typeStr: "boolean",
      default: false,
    },
    pwkey: { typeStr: "hex?", html: false, dbOnly: true },
    salt:  { typeStr: "hex?", html: false, dbOnly: true },
  },

  searchableKeys: ['username','token','access','cors','locked'], // 'models'
  illegalUsername: RegEx(/[^a-zA-Z0-9_-]/),

  // Paths that expect JSON responses (not HTML)
  jsonPaths: [ urls.prefix + urls.user + urls.token ],
}