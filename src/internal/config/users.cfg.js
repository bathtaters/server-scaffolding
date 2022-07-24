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

  apiToken: { header: "Authorization", matchToken: /^Bearer (.+)$/ },

  timestampKeyRegEx: /^(.*)Time$/,

  rateLimiter,

  tooltips: {
    password: `Must be at least ${passwordLimits.min} characters.`,
    confirm: 'Must match Password.',
    cors: 'Enter: * (all), true/false (all/none), comma-seperated urls, or RegExp(&quot;<regexp>&quot;).',
    models: 'Set read/write access based on model. No setting for a model uses default setting.',
    locked: 'Lock/Unlock entire user account'
  },

  definitions: {
    types: {
      id: "hex",
      username: "string",
      password: "string",
      token: "hex",
      access: "string[]?",
      cors: "string*",
      models: "string[]",
      failCount: "int?",
      failTime: "datetime?",
      guiCount: "int?",
      guiTime: "datetime?",
      apiCount: "int?",
      apiTime: "datetime?",
      locked: "boolean",
    },
    
    defaults: {
      username: "user",
      access: [ 'api', 'gui' ],
      models: { [allModelsKey]: ['read','write'] },
      cors: '*',
      failCount: 0,
      guiCount:  0,
      apiCount:  0,
      locked: false,
    },
  
    limits: {
      username: { min: 2, max: 255 },
      password: passwordLimits,
      confirm: passwordLimits,
  
      id: { min: 32, max: 32 },
      token: { min: 32, max: 32 },
      access: { elem: { max: 16 }, array: { max: Object.keys(access).length } },
      models: { elem: { max: 64 }, array: { max: 100 * Object.keys(models).length } },
      failCount: { min: 0, max: rateLimiter.maxFails + 1 },
      guiCount:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
      apiCount:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
      cors: { min: 0, max: 2048 },
    },
  },
}