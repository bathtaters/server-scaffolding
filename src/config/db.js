const sqlite = require('sqlite3').verbose()
const debug = require('./log.adapter').debug
const location = require('./meta').dbPath

let db

function openDb(temp = false) {
  return new Promise((res,rej) => {
    if (db) return debug('Already connected to db') || res(db)
    db = new sqlite.Database(temp ? ':memory:' : location, (err) => {
      if (err) {
        debug('Unable to connect to database:', err)
        return rej(err)
      }
      debug('Connected to database.')
      return res(db)
    })
  })
}

function closeDb() {
  return new Promise((res,rej) => {
    if (!db) return debug('Already closed db') || res()
    db.close((err) => {
      if (err) {
        debug('Unable to close database:', err)
        return rej(err)
      }
      db = null
      debug('Closed database.')
      return res()
    })
  })
}

module.exports = {
  openDb, closeDb,
  getDb: () => db,
}