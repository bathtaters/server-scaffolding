import type { Users } from '../models/Users'
import type { RoleType, TimestampType } from '../types/Users.d'
import type { DoneCallback } from 'passport'
import type { VerifyFunction as VerifyBearer } from 'passport-http-bearer'
import type { VerifyFunction as VerifyLocal  } from 'passport-local'
import session, { type Store, type SessionOptions } from 'express-session'
import SQLite from 'connect-sqlite3'
import { dirname } from 'path'
import { mkdirSync } from 'fs'
import logger from '../libs/log'
import { saveLoginMs } from '../config/users.cfg'
import { dbPath } from '../config/meta'
import { concurrentDB, isSecure, sessionCookie, sessionFile, sessionTable } from '../config/server.cfg'
import { noToken, badToken, noAccess } from '../config/errors.engine'


const dbDir = dirname(dbPath)
if (dbDir && mkdirSync(dbDir, { recursive: true })) logger.info(`Created database folder: ${dbDir}`)


const SQLiteStore = SQLite(session)
export const sessionOptions: SessionOptions = {
  name: sessionCookie,
  store: process.env.NODE_ENV === 'test' ? undefined :
    new SQLiteStore({ dir: dbDir, db: sessionFile, table: sessionTable, concurrentDB }) as Store,
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


export function authorizeBearer(Model: Users, role: RoleType): VerifyBearer {
  return (token: string | undefined, done) => {
    if (!token) return done(noToken())

    return Model.checkToken(token, role)
      .then((user) => {
        if (typeof user !== 'string') return done(null, user)
        if (user === 'NO_USER') return done(badToken())
        done(noAccess())
      })
      .catch(done)
  }
}


export function authorizeUser(Model: Users, role: RoleType): VerifyLocal {
  return (username, password, done) => 
    Model.checkPassword(username, password, role)
      .then((user) => {
        if ('fail' in user) return done(null, false, { message: user.fail })
        done(null, user)
      })
      .catch(done)
}


export const storeUser = (Model: Users) =>
  (user: any, done: DoneCallback) => done(null, user[Model.primaryId])


export const loadUser = (Model: Users, roleType: TimestampType) =>
  (id: string, done: DoneCallback) =>
    Model.get(id, { timestamp: roleType, ignoreCounter: true })
      .then((user) => user ? done(null, user) : done(null, false))
      .catch(done)
