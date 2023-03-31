import sqlite from 'sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'
import logger from './log'
import { exec, all, run, get } from '../services/db.services'
import { throttle } from '../utils/common.utils'
import { cleanupRateLimiter } from '../config/server.cfg'
import { isRootInstance } from '../config/meta'


export default class SQLiteStore {
	db: sqlite.Database
	table: string
	promise: Promise<any>
	windowMs = 0

	// Connect to DB
	constructor(
		{ db, dir = '.', table = 'rate', mode }:
		{ db?: string, dir?: string, table?: string, mode?: number } = {}
	) {

		this.table = table
		if (!db) db = this.table

		const isFile = !db.includes(':memory:') && !db.includes('?mode=memory')
		if (isFile && mkdirSync(dir, { recursive: true })) logger.info(`Created database folder: ${dir}`)

		this.db = new sqlite.Database(isFile ? join(dir, db) : db, mode)

		this.promise = exec(this.db, `CREATE TABLE IF NOT EXISTS ${this.table} (id PRIMARY KEY, hits, expires)`)
			
		var self = this
		this.promise.then(function() {
			if (!isRootInstance) return
			dbCleanup(self, true)
			setInterval(dbCleanup, cleanupRateLimiter, self).unref()
		})
	}


	// Connect to express-rate-limit

	init({ windowMs = 0 }) { this.windowMs = windowMs }

	async increment(id: string | number) {
		await this.promise
		await all(this.db, 'SELECT * FROM '+this.table)
		if (id == null) throw new Error('No id provided to rateLimiter')

		const now = Date.now()
		const expire = now + this.windowMs
		const getCols = (cols: string) => `SELECT ${cols} FROM ${this.table} WHERE id = $id AND $now <= expires`

		await run(this.db, `INSERT OR REPLACE INTO ${this.table}(id, hits, expires)
			VALUES ($id,
				COALESCE((${getCols('hits')}), 0) + 1,
				COALESCE((${getCols('expires')}), $expire)
			)`, { $id: id, $now: now, $expire: expire } as any
		)

		const current = await get(this.db, getCols('hits, expires'), { $id: id, $now: now } as any)
		if (!current) throw new Error('Unable to locate recently created rateLimit')

		return {
			totalHits: current.hits,
			resetTime: new Date(current.expires),
		}
	}

	async decrement(id: string | number) {
		await this.promise
		const now = Date.now()
		const expire = now + this.windowMs
		const get = (cols: string) => `SELECT ${cols} FROM ${this.table} WHERE id = $id AND $now <= expires`

		await run(this.db, `INSERT OR REPLACE INTO ${this.table}(id, hits, expires)
			VALUES ($id,
				COALESCE((${get('hits')}), 1) - 1,
				COALESCE((${get('expires')}), $expire)
			)`, { $id: id, $now: now, $expire: expire } as any
		)
	}

	async resetKey(id: string | number) {
		await this.promise
		await run(this.db, `DELETE FROM ${this.table} WHERE id = ?`, [id])
		logger.verbose(`Rate limiter reset IP ${id} from ${this.table}`)
	}

	async resetAll() {
		await this.promise
		await run(this.db, `DELETE FROM ${this.table}`)
		logger.verbose(`Rate limiter reset database ${this.table}`)
	}
}



// HELPERS

const writeLogCombo = throttle((tables: string[]) => logger.verbose(`Rate limiter database trimmed: ${tables.join(', ')}`), 1500)

function dbCleanup(store: SQLiteStore, skipLog = false) {
	const now = Date.now()
	run(store.db,`DELETE FROM ${store.table} WHERE ? > expires`, [now])
		.then(() => !skipLog && writeLogCombo(store.table))
}