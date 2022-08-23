const logger = require('../libs/log')
const { noDb, sqlError } = require('../config/errors.engine')

function exec(db, sql) {
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.exec('BEGIN TRANSACTION; '+sql+'; COMMIT;', (err) => {
      if (err) {
        logger.error(err, { label: 'SQL rollback' })
        return db.run('ROLLBACK', rbErr => rej(sqlError(rbErr || err, sql)))
      }
      return res()
    })
  })
}
function all(db, sql, params = []) {
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.all(sql, params, (err,row) => err ? rej(sqlError(err,sql,params)) : res(row))
  })
}
function run(db, sql, params = []) {
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.run(sql, params, (err) => err ? rej(sqlError(err,sql,params)) : res())
  })
}
function get(db, sql, params = []) {
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.get(sql, params, (err,row) => err ? rej(sqlError(err,sql,params)) : res(row))
  })
}
function getLastEntry(db, sql, params = [], table) {
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.serialize(() => {
      db.run(sql, params, (err) => err && rej(sqlError(err,sql,params)))
      db.get(
        `SELECT * FROM ${table} WHERE rowid = (SELECT last_insert_rowid())`, [],
        (err, row) => err ? rej(sqlError(err,sql,params)) : res(row)
      )
    })
  })
}

function reset(db, schema, force) {
  let drops = [], creates = []
  Object.keys(schema).forEach(table => {
    if (force) drops.push(`DROP TABLE IF EXISTS ${table}`)
    creates.push(`CREATE TABLE${force ? '' : ' IF NOT EXISTS'} ${table} (${
      Object.entries(schema[table]).map(([name,type]) => name + ' ' + type).join(', ')
    })`)
  })
  return exec(db, drops.concat(creates).join('; '))
}

function encrypt(db, sqlSecret, version = '4') {
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.serialize(() => {
      db.run(`PRAGMA cipher_compatibility = ${version}`, (err) => {
        if (err) {
          logger.error(err, { label: 'init DB encryption' })
          return rej(sqlError(err,`PRAGMA cipher_compatibility = ${version}`,params))
        }
      })
      db.run(`PRAGMA key = '${sqlSecret}'`, (err) => {
        if (err) {
          logger.error(err, { label: 'encrypting DB' })
          return rej(sqlError(err,`PRAGMA key = '<sqlSecret>'`,params))
        }
        logger.verbose('Database encryption enabled')
        return res(db)
      })
    })
  })
}

module.exports = { exec, all, run, get, getLastEntry, reset, encrypt }