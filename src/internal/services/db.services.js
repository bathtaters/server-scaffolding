const logger = require('../config/log')

function exec(db, sql) {
  return new Promise((res,rej) => {
    db.exec('BEGIN TRANSACTION; '+sql+'; COMMIT;', (err) => {
      if (err) {
        logger.error('Error executing transaction, rolling back.')
        return db.run('ROLLBACK', rbErr => rej(rbErr || err))
      }
      return res()
    })
  })
}
function all(db, sql, params = []) {
  return new Promise((res,rej) => {
    db.all(sql, params, (err,row) => err ? rej(err) : res(row))
  })
}
function run(db, sql, params = []) {
  return new Promise((res,rej) => {
    db.run(sql, params, (err) => err ? rej(err) : res())
  })
}
function get(db, sql, params = []) {
  return new Promise((res,rej) => {
    db.get(sql, params, (err,row) => err ? rej(err) : res(row))
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

module.exports = { exec, all, run, get, reset }