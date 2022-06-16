const access = { api: 1, gui: 2, admin: 4, none: 0 }

const passwordLimits = { min: 8, max: 128 }

module.exports = {
  access,
  accessMax: Object.values(access).reduce((sum,n) => sum | n, 0),

  loginAccess: [ 'gui', 'admin' ],
  requirePassword: [ 'gui', 'admin' ],

  tableFields: {
    username: 'Username', access: 'Access', password: 'Password',
    token: 'API Token', cors: 'CORS Origin', guiTime: 'GUI Access', apiTime: 'API Access'
  },
  
  encode: { iters: 1049, keylen: 64, digest: 'sha512' },

  saveLoginMs: 5 * 24 * 60 * 60 * 1000,

  apiToken: { header: "Authorization", matchToken: /^Bearer (.+)$/ },

  timestampKeyRegEx: /^(.*)Time$/,

  tooltips: {
    password: `Must be at least ${passwordLimits.min} characters.`,
    confirm: 'Must match Password.',
    cors: 'Enter: * (all), true/false (all/none), comma-seperated urls, or RegExp(&quot;<regexp>&quot;).',
  },

  validation: {
    types: {
      id: "hex",
      username: "string",
      password: "string",
      token: "hex",
      access: "string[]?",
      cors: "string*",
      guiTime: "datetime?",
      apiTime: "datetime?",
    },
    
    defaults: {
      username: "user",
      access: [ 'api', 'gui' ],
      cors: '*',
    },
  
    limits: {
      username: { min: 2, max: 255 },
      password: passwordLimits,
      confirm: passwordLimits,
  
      id: { min: 32, max: 32 },
      token: { min: 32, max: 32 },
      access: { elem: { max: 16 }, array: { max: Object.keys(access).length } },
      cors: { min: 0, max: 2048 },
    },
  },
}