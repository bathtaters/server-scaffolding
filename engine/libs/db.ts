import sqlcipher from '@journeyapps/sqlcipher'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import logger from './log'
import { encrypt, foreignKeys } from '../services/db.services'

import { dbPath } from '../config/meta'
import { definitions } from '../config/settings.cfg'
import { testDb } from '../testing/test.cfg'

const sqlSecret = process.env.DB_SECRET ?? definitions.DB_SECRET.default
const dbSrc = process.env.NODE_ENV === 'test' ? testDb : dbPath
const dbDir = process.env.NODE_ENV !== 'test' && dirname(dbSrc)

type DB = sqlcipher.Database

let db: DB | null = null
export const getDb = () => db

const sqlite = sqlcipher.verbose()

export function openDb() {
  return new Promise<DB>((res,rej) => {
    if (db) { logger.verbose('Already connected db'); return res(db) }
    if (dbDir && mkdirSync(dbDir, { recursive: true })) logger.info(`Created database folder: ${dbDir}`)

    db = new sqlite.Database(dbSrc, (err) => {
      if (err) {
        logger.error(err as any, { label: 'opening DB' })
        return rej(err)
      }
      logger.verbose('Connected to main database')
    })

    const end = () => db ? res(db) : rej('Database not loaded')

    if (typeof sqlSecret !== 'string' || !sqlSecret) foreignKeys(db, false).then(end)
    else encrypt(db, sqlSecret).then(() => foreignKeys(db, false)).then(end)
  })
}

export function closeDb() {
  return new Promise<void>((res,rej) => {
    if (!db) { logger.verbose('Already disconnected db'); return res() }
    db.close((err) => {
      if (err) {
        logger.error(err as any, { label: 'closing DB' })
        return rej(err)
      }
      db = null
      logger.verbose('Disconnected database')
      return res()
    })
  })
}