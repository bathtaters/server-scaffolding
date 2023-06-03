import type { Database } from '@journeyapps/sqlcipher'
import type { ForeignKeyRef } from '../types/Model.d'
import type { CreateSchema, SQLInfo } from '../types/db.d'
import { nullColumn } from '../types/db'
import logger from '../libs/log'
import { noDb, sqlError, sqlNotDB } from '../config/errors.engine'
import { debugSQL } from '../config/models.cfg'


/** Run multiple statements sequentially as a transaction, reject and rollback on error */
export function multiRun(db: Database | null, statements: [sql: string, params?: Params][]) {
  debugSQL && statements.forEach(([sql,params]) => logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`))

  return new Promise<SQLInfo>((res,rej) => {
    if (!db) return rej(noDb())
    
    let total: { lastID?: number, changes: number } = { changes: 0 }

    db.serialize(() => {
      db.run('BEGIN', rollback(db, 'BEGIN', rej))

      for (const [sql, params] of statements) {
        db.run(
          sql, params,
          rollback(
            db, sql, rej,
            ({ lastID, changes = 0 }) => {
              // Update totals
              total.lastID   = lastID ?? total.lastID
              total.changes += changes
            }
          )
        )
      }

      db.run('COMMIT', rollback(db, 'COMMIT', rej, () => res(total)))
    })
  })
}


/** Retrieve multiple rows of a SELECT statement */
export function all<T = any>(db: Database | null, sql: string, params: Params = []) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)

  return new Promise<T[]>((res,rej) => {
    if (!db) return rej(noDb())

    db.all(sql, params, (err,row) => err ? rej(sqlError(err,sql,params)) : res(row))
  })
}


/** Execute an INSERT, UPDATE or DELETE statement, returning info about the operation */
export function run(db: Database | null, sql: string, params: Params = []) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)

  return new Promise<SQLInfo>((res,rej) => {
    if (!db) return rej(noDb())

    db.run(sql, params, function(this: SQLInfo, err) {
      return err ? rej(sqlError(err,sql,params)) : res(this)
    })
  })
}


/** Retrieve the first row of a SELECT statement */
export function get<T = any>(db: Database | null, sql: string, params: Params = []) {
  debugSQL && logger.verbose(`<SQL> ${sql} ${JSON.stringify(params)}`)

  return new Promise<T>((res,rej) => {
    if (!db) return rej(noDb())

    db.get(sql, params, (err,row) => err ? rej(sqlError(err,sql,params)) : res(row))
  })
}


/** Build/Rebuild/Connect to a Database, using the defined tableSchema */
export function reset<Tables extends string, Schema extends CreateSchema>(
  db: Database | null,
  tableSchema: { [table in Tables]: Schema },
  force = false,
  indexes: Partial<{ [table in Tables]: Array<keyof Schema> }> = {},
  refs:    Partial<{ [table in Tables]: ForeignKeyRef }> = {}
) {
  let drops: string[] = [], creates: string[] = []

  for (const table in tableSchema) {
    if (force) drops.push(`DROP TABLE IF EXISTS ${table}`)

    let cols: string[] = [`${nullColumn} INTEGER`]

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

  return multiRun(db, drops.concat(creates).map((sql) => [sql]))
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



// HELPERS

/** Params type for SQL engine */
type Params = { [key: string]: any } | any[]

/** Rollback transaction on Error, if onSuccess function provided, it will be called on non error */
function rollback(db: Database, errInfo: string, onError: (err: any) => any, onSuccess?: (info: SQLInfo) => any) {
  return function (this: SQLInfo, err: any) {
    if (!err) return onSuccess?.(this)

    if (err.code === 'SQLITE_NOTADB') onError(sqlNotDB())
    
    return db.run('ROLLBACK', (rbErr) => {
      if (rbErr) logger.error(err, { label: 'Pre-Rollback Error' })
      onError(sqlError(rbErr || err, errInfo))
    })
  }
}