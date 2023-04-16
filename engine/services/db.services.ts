import type { Database } from '@journeyapps/sqlcipher'
import type { ForeignKeyRef } from '../types/Model'
import logger from '../libs/log'
import { noDb, sqlError, sqlNotDB } from '../config/errors.engine'
import { debugSQL } from '../config/models.cfg'

// TO DO -- add to ./libs/db, make into class called SQLite extends DB

type Params = { [key: string]: any } | any[]


export function exec(db: Database | null, sql: string) {
  debugSQL && logger.verbose(`<SQL> ${sql}`)

  return new Promise<void>((res,rej) => {
    if (!db) return rej(noDb())

    db.exec('BEGIN; '+sql+'; COMMIT;', rollback(db, sql, rej, res))
  })
}


/** Run multiple statements sequentially as a transaction, reject and rollback on error */
export function multiRun(db: Database | null, statements: [sql: string, params: Params][]) {
  debugSQL && statements.forEach(([sql,params]) => logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`))

  return new Promise<void>((res,rej) => {
    if (!db) return rej(noDb())
    
    db.serialize(() => {
      db.run('BEGIN', rollback(db, 'BEGIN', rej))
      for (const [sql, params] of statements) {
        db.run(sql, params, rollback(db, sql, rej))
      }
      db.run('COMMIT', rollback(db, 'COMMIT', rej, res))
    })
  })
}


export function all<T = any>(db: Database | null, sql: string, params: Params = []) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)

  return new Promise<T[]>((res,rej) => {
    if (!db) return rej(noDb())

    db.all(sql, params, (err,row) => err ? rej(sqlError(err,sql,params)) : res(row))
  })
}


export function run(db: Database | null, sql: string, params: Params = []) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)

  return new Promise<void>((res,rej) => {
    if (!db) return rej(noDb())

    db.run(sql, params, (err) => err ? rej(sqlError(err,sql,params)) : res())
  })
}


export function get<T = any>(db: Database | null, sql: string, params: Params = []) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)

  return new Promise<T>((res,rej) => {
    if (!db) return rej(noDb())

    db.get(sql, params, (err,row) => err ? rej(sqlError(err,sql,params)) : res(row))
  })
}


export function getLastEntry<T = any>(db: Database | null, sql: string, params: Params, table: string) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)

  return new Promise<T>((res,rej) => {
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


export function reset<Tables extends string, Schema extends Record<string, string | false | undefined>>(
  db: Database | null,
  tableSchema: { [table in Tables]: Schema },
  force = false,
  indexes: Partial<{ [table in Tables]: Array<keyof Schema> }> = {},
  refs:    Partial<{ [table in Tables]: ForeignKeyRef }> = {}
) {
  let drops: string[] = [], creates: string[] = []

  for (const table in tableSchema) {
    if (force) drops.push(`DROP TABLE IF EXISTS ${table}`)

    let cols: string[] = []

    for (const col in tableSchema[table]) {
      if (tableSchema[table][col]) cols.push(`${col} ${tableSchema[table][col]}`)
    }

    if (refs[table]) {
      cols.push(
        `CONSTRAINT fk_${refs[table]?.table} FOREIGN KEY (${
          refs[table]?.key
        }) REFERENCES ${
          refs[table]?.table
        }(${
          refs[table]?.refKey
        })${
          refs[table]?.onDelete ? ` ON DELETE ${refs[table]?.onDelete}` : ''
        }${
          refs[table]?.onUpdate ? ` ON UPDATE ${refs[table]?.onUpdate}` : ''
        }`
      )
    }

    creates.push(`CREATE TABLE${force ? '' : ' IF NOT EXISTS'} ${table} (${cols.join(', ')})`)

    if (indexes[table]?.length) {
      creates.push(
        `CREATE UNIQUE INDEX IF NOT EXISTS ${
          indexes[table]?.join('_')
        } ON ${table} (${
          indexes[table]?.join(', ')
        })`
      )
    }
  }

  return exec(db, drops.concat(creates).join('; '))
}


export function encrypt(db: Database | null, sqlSecret: string, version = '4') {
  return new Promise<Database>((res,rej) => {
    if (!db) return rej(noDb())

    db.serialize(() => {
      db.run(`PRAGMA cipher_compatibility = ${version}`, (err: any) => {
        if (err) {
          logger.error(err, { label: 'init DB encryption' })
          return rej(sqlError(err,`PRAGMA cipher_compatibility = ${version}`))
        }

        debugSQL && logger.verbose(`<SQL> Cipher compatibility set to ${version}`)
      })

      db.run(`PRAGMA key = '${sqlSecret}'`, (err: any) => {
        if (err) {
          logger.error(err, { label: 'encrypting DB' })
          return rej(sqlError(err,`PRAGMA key = '<sqlSecret>'`))
        }

        logger.verbose('Database encryption enabled')
        return res(db)
      })
    })
  })
}


export function foreignKeys(db: Database | null, disable = false) {
  return new Promise<Database>((res,rej) => !db ? rej(noDb()) :
    db.exec(`PRAGMA foreign_keys = ${disable ? 'OFF' : 'ON'};`, (err: any) => {
      if (err) {
        logger.error(err, { label: `${disable ? 'Disable' : 'Enable'} foreign keys` })
        return rej(sqlError(err,`PRAGMA foreign_keys = ${disable ? 'OFF' : 'ON'}`))
      }

      debugSQL && logger.verbose(`<SQL> Foreign key support ${disable ? 'disabled' : 'enabled'}`)
      return res(db)
    })
  )
}



// HELPER

/** Rollback transaction on Error, if onSuccess function provided, it will be called on non error */
function rollback(db: Database, errInfo: string, onError: Function, onSuccess?: Function) {
  return (err: any) => {
    if (!err) return onSuccess?.();

    if (err.code === 'SQLITE_NOTADB') onError(sqlNotDB())
    
    return db.run('ROLLBACK', (rbErr) => {
      if (rbErr) logger.error(err, { label: 'Pre-Rollback Error' })
      onError(sqlError(rbErr || err, errInfo))
    })
  }
}