const sqlite = require('sqlite3').verbose()
const logger = require('./log.adapter')
const location = require('./meta').dbPath

let db

function openDb(temp = false) {
  return new Promise((res,rej) => {
    if (db) return logger.debug('Already connected to db') || res(db)
    db = new sqlite.Database(temp ? ':memory:' : location, (err) => {
      if (err) {
        logger.error('Unable to connect to database:', err)
        return rej(err)
      }
      logger.info('Connected to database.')
      return res(db)
    })
  })
}

function closeDb() {
  return new Promise((res,rej) => {
    if (!db) return logger.debug('Already closed db') || res()
    db.close((err) => {
      if (err) {
        logger.error('Unable to close database:', err)
        return rej(err)
      }
      db = null
      logger.info('Closed database.')
      return res()
    })
  })
}

module.exports = {
  openDb, closeDb,
  getDb: () => db,
}