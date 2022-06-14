const access = { api: 1, gui: 2, admin: 4, none: 0 }

const accessMax = Object.values(access).reduce((sum,n) => sum + n, 0)

const limits = {
  username: { min: 2, max: 255 },
  password: { min: 8, max: 128 },
}
limits.confirm = limits.password

module.exports = {
  access, accessMax, limits,
  defaultAccess: [ 'api', 'gui' ],
  initialAccess: [ 'gui', 'admin' ],
  requirePassword: [ 'gui', 'admin' ],

  tableFields: { username: 'Username', access: 'Access', password: 'Password', token: 'API Token', cors: 'CORS Origin', guiTime: 'GUI Access', apiTime: 'API Access' },
  
  encode: { iters: 1049, keylen: 64, digest: 'sha512' },

  saveLoginMs: 5 * 24 * 60 * 60 * 1000,

  apiToken: { header: "Authorization", matchToken: /^Bearer (.+)$/ },

  tooltips: {
    password: `Must be at least ${limits.password.min} characters.`,
    confirm: 'Must match Password.',
    cors: 'Enter: * (all), true/false (all/none), comma-seperated urls, or RegExp(&quot;<regexp>&quot;).',
  },
}