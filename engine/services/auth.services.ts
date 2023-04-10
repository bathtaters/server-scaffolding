import session, { type Store, type SessionOptions } from 'express-session'
import SQLite from 'connect-sqlite3'
import { dirname } from 'path'
import { mkdirSync } from 'fs'
import logger from '../libs/log'
import { saveLoginMs } from '../config/users.cfg'
import { dbPath } from '../config/meta'
import { concurrentDB, isSecure, sessionCookie, sessionFile, sessionTable } from '../config/server.cfg'
import { noToken, badToken, noAccess, noUser } from '../config/errors.engine'

import type UserModel from '../models/Users'
import { AccessType, TimestampType, UsersUI } from '../types/Users'
type User = typeof UserModel
type Done = (error: any | null, userData?: any | false, flashData?: any) => void


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


export function authorizeBearer(Model: User, accessLevel: number) {
  return (token: string | undefined, done: Done) => {
    if (!token) return done(noToken())

    return Model.checkToken(token, accessLevel)
      .then((user) => {
        if (typeof user !== 'string') return done(null, user)
        if (user === 'NO_USER') return done(badToken())
        done(noAccess())
      })
      .catch(done)
  }
}


export function authorizeUser(Model: User, accessLevel: number) {
  return (username: string, password: string, done: Done) => 
    Model.checkPassword(username, password, accessLevel)
      .then((user) => {
        if ('fail' in user) return done(null, false, { message: user.fail })
        done(null, user)
      })
      .catch(done)
}


export const storeUser = (Model: User) => (user: any, done: Done) => done(null, user[Model.primaryId])


export const loadUser = (Model: User, accessType: TimestampType) =>
  (id: string, done: Done) => Model.get(id, { timestamp: accessType, ignoreCounter: true })
    .then((user) => user ? done(null, user) : done(null, false, noUser()))
    .catch(done)
