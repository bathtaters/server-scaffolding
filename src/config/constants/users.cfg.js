const access = { api: 1, gui: 2, admin: 4, none: 0 }

const accessMax = Object.values(access).reduce((sum,n) => sum + n, 0)

module.exports = {
  access,
  accessMax,
  defaultAccess: [ 'api', 'gui' ],
  initialAccess: [ 'gui', 'admin' ],

  tableFields: { username: 'Username', access: 'Access', id: 'API ID', urls: 'CORS' },
  
  encode: { iters: 1049, keylen: 64, digest: 'sha512' },

  saveLoginMs: 5 * 24 * 60 * 60 * 1000,
}