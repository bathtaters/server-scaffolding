const sqlite = require('sqlite3').verbose()
const mkDir = require('fs').mkdirSync
const logger = require('./log.adapter')
const { dbPath, dbDir } = require('./meta')

let db

function openDb(temp = false) {
  return new Promise((res,rej) => {
    if (db) return logger.debug('Already connected db') || res(db)
    if (mkDir(dbDir, { recursive: true })) logger.info('Created database folder:', dbDir)

    db = new sqlite.Database(temp ? ':memory:' : dbPath, (err) => {
      if (err) {
        logger.error('Unable to connect database:', err)
        return rej(err)
      }
      logger.info('Connected to database')
      return res(db)
    })
  })
}

function closeDb() {
  return new Promise((res,rej) => {
    if (!db) return logger.debug('Already disconnected db') || res()
    db.close((err) => {
      if (err) {
        logger.error('Unable to disconnect database:', err)
        return rej(err)
      }
      db = null
      logger.info('Disconnected database')
      return res()
    })
  })
}

module.exports = {
  openDb, closeDb,
  getDb: () => db,
}