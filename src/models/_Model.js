const { openDb, getDb } = require('../config/db')
const services = require('../services/db.services')
const { sanitizeSchemaData, schemaFromValidate } = require('../utils/db.utils')
const validateDefaults = require('../config/constants/validation.cfg').defaults
const errors = require('../config/constants/error.messages')

class Model {

  constructor(title, { defaults, schema, primaryId = 'id' } = {}) {
    if (!schema) schema = schemaFromValidate(title, primaryId)
    if (!schema) throw new Error(`Schema for ${title} not provided and does not exist in validation.json.`)

    if (!schema[primaryId]) schema[primaryId] = 'INTEGER PRIMARY KEY'

    this.title = title.toLowerCase()
    this.schema = sanitizeSchemaData(schema)
    this.defaults = defaults != null ? defaults : validateDefaults[title] 
    this.primaryId = primaryId

    this.isInitialized = new Promise(async (res, rej) => {
      if (!getDb()) { await openDb() }
      this.create().then(() => res(true)).catch(rej)
    })
  }

  create(overwrite = false) {
    return services.reset(getDb(), { [this.title]: this.schema }, overwrite).then(() => ({ success: true }))
  }
    
  get(id = null, idKey = null) {
    if (!id) return services.all(getDb(), `SELECT * FROM ${this.title}`)
    return services.get(getDb(), `SELECT * FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`, [id])
  }

  count(id = null, idKey = null) {
    return services.get(getDb(),
      `SELECT COUNT(*) cnt FROM ${this.title}${id ? ` WHERE ${idKey || this.primaryId} = ?` : ''}`,
      id ? [id] : []
    ).then((count) => count && count.cnt)
  }
    
  add(data) {
    data = services.sanitizeSchemaData(data, this.schema)
    if (this.defaults) data = { ...this.defaults, ...data }
    
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject(errors.noData())
  
    return services.get(getDb(), 
      `INSERT INTO ${this.title}(${ keys.join(', ') }) VALUES(${ keys.map(()=>'?').join(', ') }) RETURNING id`,
      Object.values(data)
    ).then((row) => row && row[this.primaryId])
  }
    
  update(id, data, idKey = null) {
    if (!id) return Promise.reject(errors.noID())

    data = services.sanitizeSchemaData(data, this.schema)
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject(errors.noData())

    return this.count(id, idKey || this.primaryId).then((exists) => {
      if (!exists) throw errors.noEntry(id)

      return services.run(getDb(), 
        `UPDATE ${this.title} SET ${ keys.map(k => k+' = ?').join(', ') } WHERE ${idKey || this.primaryId} = ?`,
        [...Object.values(data), id]
      )
    }).then(() => ({ success: true }))
  }
  
  remove(id, idKey = null) {
    if (!id) return Promise.reject(errors.noID())

    return this.count(id, idKey || this.primaryId).then((exists) => {
      if (!exists) throw errors.noEntry(id)
      
      return services.run(getDb(), `DELETE FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`, [id])
    }).then(() => ({ success: true }))
  }
}

module.exports = Model
