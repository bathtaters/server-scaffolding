import session from 'express-session'
import SQLite from 'connect-sqlite3'
import { dirname } from 'path'
import { mkdirSync } from 'fs'
import logger from '../libs/log'
import { saveLoginMs } from '../config/users.cfg'
import { dbPath } from '../config/meta'
import { concurrentDB, isSecure, sessionCookie, sessionFile, sessionTable } from '../config/server.cfg'
import { noToken, badToken, noAccess, noUser } from '../config/errors.engine'

// TO DO -- Fix types once UserModel is refactored
import UserModel from '../models/Users'
type User = typeof UserModel | any
type Done = (error: any | null, userData?: any | false, flashData?: any) => void


const dbDir = dirname(dbPath)
if (dbDir && mkdirSync(dbDir, { recursive: true })) logger.info(`Created database folder: ${dbDir}`)


const SQLiteStore = SQLite(session)
export const sessionOptions = {
  name: sessionCookie,
  store: process.env.NODE_ENV === 'test' ? undefined :
    new SQLiteStore({ dir: dbDir, db: sessionFile, table: sessionTable, concurrentDB }),
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


export function authorizeBearer(Model: User, accessLevel: number) {
  return (token: string | undefined, done: Done) => {
    if (!token) return done(noToken())

    return Model.checkToken(token, accessLevel)
      .then((user?: User) => {
        if (user == null) return done(badToken())
        if (!user) return done(noAccess())
        return done(null, user)
      })
      .catch(done)
  }
}


export function authorizeUser(Model: User, accessLevel: number) {
  return (username: string, password: string, done: Done) => 
    Model.checkPassword(username, password, accessLevel)
      .then((user?: User) => {
        if (!user) return done(null, false)
        if (user.fail) return done(null, false, { message: user.fail })
        done(null, user)
      })
      .catch(done)
}


export const storeUser = (Model: User) => (user: User, done: Done) => done(null, user[Model.primaryId])


export const loadUser = (Model: User, accessStr: string) =>
  (id: string, done: Done) => Model.get(id, null, false, accessStr, true)
    .then((user?: User) => user ? done(null, user) : done(null, false, noUser()))
    .catch(done)
