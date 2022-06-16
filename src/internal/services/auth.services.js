const session = require('express-session')
const SQLiteStore = require('connect-sqlite3')(session)
const { saveLoginMs } = require('../config/users.cfg')
const { dbDir } = require('../../config/meta')

exports.sessionOptions = {
  store: new SQLiteStore({ dir: dbDir, db: 'sessions.db' }),
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: saveLoginMs,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  },
}

exports.authorizeUser = (Model, accessLevel) => (username, password, done) => 
  Model.checkPassword(username, password, accessLevel).then((user) => {
    if (!user) return done(null, false)
    if (user.fail) return done(null, false, { message: user.fail })
    done(null, user)
  }).catch(done)

exports.storeUser = (Model) => (user, done) => done(null, user[Model.primaryId])
exports.loadUser = (Model) => (id, done) => Model.get(id, null, 'gui').then((user) =>
  done(null, user || false, user ? undefined : { message: 'User not found' })
).catch(done)
