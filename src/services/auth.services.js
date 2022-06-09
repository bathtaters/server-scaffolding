const session = require('express-session')
const SQLiteStore = require('connect-sqlite3')(session)
const { saveLoginMs } = require('../config/users.cfg')
const { protectedPrefix, dbDir } = require('../config/meta')

exports.sessionOptions = {
  store: new SQLiteStore({ dir: dbDir, db: 'sessions.db' }),
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: true,
  cookie: { path: `/${protectedPrefix}`, maxAge: saveLoginMs, secure: 'auto', sameSite: true },
}

exports.authorizeUser = (Model) => (username, password, done) => 
  Model.checkPassword(username, password).then((user) => {
    if (!user) return done(null, false)
    if (user.fail) return done(null, false, { message: user.fail })
    done(null, user)
  }).catch(done)

exports.storeUser = (user, done) => done(null, user.id)
exports.loadUser = (Model) => (id, done) => Model.get(id).then((user) => done(null, user)).catch(done)
