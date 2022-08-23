const sqlite = require('sqlite3')
const { join } = require('path')
const mkDir = require('fs').mkdirSync
const logger = require('./log')
const services = require('../services/db.services')
const { throttle } = require('../utils/common.utils')
const { cleanupRateLimiter } = require('../config/server.cfg')

class SQLiteStore {

	// Connect to DB

  constructor({ db, dir = '.', table = 'rate', mode } = {}) {
    this.table = table
    if (!db) db = this.table

		const isFile = !db.includes(':memory:') && !db.includes('?mode=memory')
		if (isFile && mkDir(dir, { recursive: true })) logger.info(`Created database folder: ${dir}`)

    this.db = new sqlite.Database(isFile ? join(dir, db) : db, mode)

		this.promise = services.exec(this.db, `CREATE TABLE IF NOT EXISTS ${this.table} (id PRIMARY KEY, hits, expires)`)
		
    var self = this
		this.promise.then(function() {
			dbCleanup(self, true)
			setInterval(dbCleanup, cleanupRateLimiter, self).unref()
		})
  }


	// Connect to express-rate-limit

	init({ windowMs }) { this.windowMs = windowMs }

	async increment(id) {
		await this.promise
		await services.all(this.db, 'SELECT * FROM '+this.table)
		if (id == null) throw new Error('No id provided to rateLimiter')

		const now = getNow()
		const expire = now + this.windowMs
		const get = (cols) => `SELECT ${cols} FROM ${this.table} WHERE id = $id AND $now <= expires`

		await services.run(this.db, `INSERT OR REPLACE INTO ${this.table}(id, hits, expires)
			VALUES ($id,
				COALESCE((${get('hits')}), 0) + 1,
				COALESCE((${get('expires')}), $expire)
			)`, { $id: id, $now: now, $expire: expire }
		)

		const current = await services.get(this.db, get('hits, expires'), { $id: id, $now: now })
		if (!current) throw new Error('Unable to locate recently created rateLimit')

		return {
			totalHits: current.hits,
			resetTime: new Date(current.expires),
		}
	}

	async decrement(id) {
		await this.promise
		const now = getNow()
		const expire = now + this.windowMs
		const get = (cols) => `SELECT ${cols} FROM ${this.table} WHERE id = $id AND $now <= expires`

		await services.run(this.db, `INSERT OR REPLACE INTO ${this.table}(id, hits, expires)
			VALUES ($id,
				COALESCE((${get('hits')}), 1) - 1,
				COALESCE((${get('expires')}), $expire)
			)`, { $id: id, $now: now, $expire: expire }
		)
	}

	async resetKey(id) {
		await this.promise
		await services.run(this.db, `DELETE FROM ${this.table} WHERE id = ?`, [id])
		logger.verbose(`Rate limiter reset IP ${id} from ${this.table}`)
	}

	async resetAll() {
		await this.promise
		await services.run(this.db, `DELETE FROM ${this.table}`)
		logger.verbose(`Rate limiter reset database ${this.table}`)
	}
}

module.exports = SQLiteStore


// HELPERS

const getNow = () => new Date().getTime()

const writeLogCombo = throttle((tables) => logger.verbose(`Rate limiter database trimmed: ${tables.join(', ')}`), 1500)

function dbCleanup(store, skipLog = false) {
	const now = getNow()
	services.run(store.db,`DELETE FROM ${store.table} WHERE ? > expires`, [now])
		.then(() => !skipLog && writeLogCombo(store.table))
}