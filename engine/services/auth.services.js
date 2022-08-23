const session = require('express-session')
const SQLiteStore = require('connect-sqlite3')(session)
const { dirname } = require('path')
const mkDir = require('fs').mkdirSync
const { saveLoginMs } = require('../config/users.cfg')
const { dbPath } = require('../config/meta')
const { concurrentDB, isSecure } = require('../config/server.cfg')
const errors = require('../config/errors.engine')

const dbDir = dirname(dbPath)
if (dbDir && mkDir(dbDir, { recursive: true })) logger.info(`Created database folder: ${dbDir}`)

exports.sessionOptions = {
  name: 'sessionID',
  store: process.env.NODE_ENV === 'test' ? undefined :
    new SQLiteStore({ dir: dbDir, db: 'sessions.db', table: 'sessions', concurrentDB }),
  secret: process.env.SESSION_SECRET || require('../config/settings.cfg').definitions.SESSION_SECRET.default,
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    maxAge: saveLoginMs,
    sameSite: 'strict',
    secure: isSecure,
  },
}

exports.authorizeBearer = (Model, accessLevel) => (token, done) => !token ? done(errors.noToken()) :
  Model.checkToken(token, accessLevel).then((user) => 
    user == null ? done(errors.badToken()) : !user ? done(errors.noAccess()) : done(null, user)
  ).catch(done)

exports.authorizeUser = (Model, accessLevel) => (username, password, done) => 
  Model.checkPassword(username, password, accessLevel).then((user) => {
    if (!user) return done(null, false)
    if (user.fail) return done(null, false, { message: user.fail })
    done(null, user)
  }).catch(done)

exports.storeUser = (Model) => (user, done) => done(null, user[Model.primaryId])
exports.loadUser = (Model, accessStr) => (id, done) => Model.get(id, null, false, accessStr, true).then((user) => 
  done(null, user || false, user ? undefined : errors.noUser())
).catch(done)
