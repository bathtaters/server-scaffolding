const sqlite = require('sqlite3')
const logger = require('./log')
const services = require('../services/db.services')
const { join } = require('path')

// How often to comb through DB and erase outdated entries
const cleanupInterval = 6 * 60 * 60 * 1000 // 6 hrs

class SQLiteStore {
	
	// Static methods

	static #now() { return new Date().getTime() }

	static #dbCleanup(store, skipLog = false) {
    const now = this.#now()
    services.run(store.db,`DELETE FROM ${store.table} WHERE ? > expires`, [now])
			.then(() => !skipLog && logger.verbose(`RateLimiter ${store.table} database trimmed`))
  }


	// Connect to DB

  constructor({ db, dir = '.', table = 'rate', mode } = {}) {
    this.table = table
    if (!db) db = this.table

    const dbPath = db.includes(':memory:') || db.includes('?mode=memory') ? db : join(dir, db)
    this.db = new sqlite.Database(dbPath, mode)

		this.promise = services.exec(this.db, `CREATE TABLE IF NOT EXISTS ${this.table} (key PRIMARY KEY, hits, expires)`)
		
    let self = this
		this.promise.then(function() {
			SQLiteStore.#dbCleanup(self, true)
			setInterval(SQLiteStore.#dbCleanup, cleanupInterval, self).unref()
		})
  }


	// Connect to express-rate-limit

	init({ windowMs }) { this.windowMs = windowMs }

	async increment(key) {
		await this.promise
		await services.all(this.db, 'SELECT * FROM '+this.table)
		if (key == null) throw new Error('No key provided to rateLimiter')

		const now = SQLiteStore.#now()
		const expire = now + this.windowMs
		const get = (cols) => `SELECT ${cols} FROM ${this.table} WHERE key = $key AND $now <= expires`

		await services.run(this.db, `INSERT OR REPLACE INTO ${this.table}(key, hits, expires)
			VALUES ($key,
				COALESCE((${get('hits')}), 0) + 1,
				COALESCE((${get('expires')}), $expire)
			)`, { $key: key, $now: now, $expire: expire }
		)

		const current = await services.get(this.db, get('hits, expires'), { $key: key, $now: now })
		if (!current) throw new Error('Unable to locate recently created rateLimit')

		return {
			totalHits: current.hits,
			resetTime: new Date(current.expires),
		}
	}

	async decrement(key) {
		await this.promise
		const now = SQLiteStore.#now()
		const expire = now + this.windowMs
		const get = (cols) => `SELECT ${cols} FROM ${this.table} WHERE key = $key AND $now <= expires`

		await services.run(this.db, `INSERT OR REPLACE INTO ${this.table}(key, hits, expires)
			VALUES ($key,
				COALESCE((${get('hits')}), 1) - 1,
				COALESCE((${get('expires')}), $expire)
			)`, { $key: key, $now: now, $expire: expire }
		)
	}

	async resetKey(key) {
		await this.promise
		await services.run(this.db, `DELETE FROM ${this.table} WHERE key = ?`, [key])
		logger.verbose(`RateLimiter reset IP ${key} from ${this.table}`)
	}

	async resetAll() {
		await this.promise
		await services.run(this.db, `DELETE FROM ${this.table}`)
		logger.verbose(`RateLimiter reset database ${this.table}`)
	}
}

module.exports = SQLiteStore