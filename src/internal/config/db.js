const sqlite = require('sqlite3').verbose()
const mkDir = require('fs').mkdirSync
const logger = require('./log')
const { dbPath } = require('../../config/meta')
const dbDir = require('path').dirname(dbPath)

let db

function openDb() {
  return new Promise((res,rej) => {
    if (db) { logger.verbose('Already connected db'); return res(db) }
    if (mkDir(dbDir, { recursive: true })) logger.info(`Created database folder: ${dbDir}`)

    db = new sqlite.Database(process.env.NODE_ENV === 'test' ? ':memory:' : dbPath, (err) => {
      if (err) {
        logger.error(err, { label: 'opening DB' })
        return rej(err)
      }
      logger.verbose('Connected to database')
      return res(db)
    })
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