const sqlite = require('@journeyapps/sqlcipher').verbose()
const mkDir = require('fs').mkdirSync
const logger = require('./log')
const { encrypt, foreignKeys } = require('../services/db.services')

const sqlSecret = process.env.DB_SECRET ?? require('../config/settings.cfg').definitions.DB_SECRET.default
const dbSrc = process.env.NODE_ENV === 'test' ? require('../testing/test.cfg').testDb : require('../config/meta').dbPath
const dbDir = process.env.NODE_ENV !== 'test' && require('path').dirname(dbSrc)

let db

function openDb() {
  return new Promise((res,rej) => {
    if (db) { logger.verbose('Already connected db'); return res(db) }
    if (dbDir && mkDir(dbDir, { recursive: true })) logger.info(`Created database folder: ${dbDir}`)

    db = new sqlite.Database(dbSrc, (err) => {
      if (err) {
        logger.error(err, { label: 'opening DB' })
        return rej(err)
      }
      logger.verbose('Connected to main database')
    })

    if (sqlSecret) encrypt(db, sqlSecret).then(() => foreignKeys(db, false)).then(() => res(db))
    else foreignKeys(db, false).then(() => res(db))
  })
}

function closeDb() {
  return new Promise((res,rej) => {
    if (!db) { logger.verbose('Already disconnected db'); return res() }
    db.close((err) => {
      if (err) {
        logger.error(err, { label: 'closing DB' })
        return rej(err)
      }
      db = null
      logger.verbose('Disconnected database')
      return res()
    })
  })
}

module.exports = {
  openDb, closeDb,
  getDb: () => db,
}