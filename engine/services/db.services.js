const logger = require('../libs/log')
const { noDb, sqlError, sqlNotDB } = require('../config/errors.engine')
const { debugSQL } = require('../config/models.cfg')

function exec(db, sql) {
  debugSQL && logger.verbose(`<SQL> ${sql}`)
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.exec('BEGIN TRANSACTION; '+sql+'; COMMIT;', (err) => {
      if (err) {
        if (err.code === 'SQLITE_NOTADB') throw sqlNotDB()
        logger.error(err, { label: 'SQL rollback' })
        return db.run('ROLLBACK', rbErr => rej(sqlError(rbErr || err, sql)))
      }
      return res()
    })
  })
}
function all(db, sql, params = []) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.all(sql, params, (err,row) => err ? rej(sqlError(err,sql,params)) : res(row))
  })
}
function run(db, sql, params = []) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.run(sql, params, (err) => err ? rej(sqlError(err,sql,params)) : res())
  })
}
function get(db, sql, params = []) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)
  return new Promise((res,rej) => {
    if (!db) return rej(noDb())
    db.get(sql, params, (err,row) => err ? rej(sqlError(err,sql,params)) : res(row))
  })
}
function getLastEntry(db, sql, params = [], table) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)
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

function reset(db, schema, force, indexes = {}, refs = {}) {
  let drops = [], creates = []
  Object.keys(schema).forEach((table) => {
    if (force) drops.push(`DROP TABLE IF EXISTS ${table}`)
    creates.push(`CREATE TABLE${force ? '' : ' IF NOT EXISTS'} ${table} (${
      Object.entries(schema[table]).map(([name,type]) => name + ' ' + type).join(', ')
    }${!refs[table] ? '' : 
      `, CONSTRAINT fk_${refs[table].table} FOREIGN KEY (${refs[table].key}) REFERENCES ${refs[table].table}(${refs[table].refKey})${
        refs[table].onDelete ? ` ON DELETE ${refs[table].onDelete}` : ''
      }${
        refs[table].onUpdate ? ` ON UPDATE ${refs[table].onUpdate}` : ''
      }`
    })`)
    if (indexes[table] && indexes[table].length)
      creates.push(`CREATE UNIQUE INDEX IF NOT EXISTS ${indexes[table].join('_')} ON ${table} (${indexes[table].join(', ')})`)
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
        debugSQL && logger.verbose(`<SQL> Cipher compatibility set to ${version}`)
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

function foreignKeys(db, disable = false) {
  return new Promise((res,rej) => db.exec(`PRAGMA foreign_keys = ${disable ? 'OFF' : 'ON'};`, (err) => {
    if (err) {
      logger.error(err, { label: `${disable ? 'Disable' : 'Enable'} foreign keys` })
      return rej(sqlError(err,`PRAGMA foreign_keys = ${disable ? 'OFF' : 'ON'}`))
    }
    debugSQL && logger.verbose(`<SQL> Foreign key support ${disable ? 'disabled' : 'enabled'}`)
    return res(db)
  }))
}

module.exports = { exec, all, run, get, getLastEntry, reset, encrypt, foreignKeys }