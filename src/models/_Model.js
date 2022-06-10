const { openDb, getDb } = require('../config/db')
const services = require('../services/db.services')
const validateDefaults = require('../config/constants/validation.cfg').defaults
const errors = require('../config/constants/error.messages')

class Model {

  constructor(title, schema, defaults) {
    if (!schema.id) schema.id = 'INTEGER PRIMARY KEY'

    this.title = title.toLowerCase()
    this.schema = services.sanitizeSchemaData(schema)
    this.defaults = defaults != null ? defaults : validateDefaults[title]

    this.isInitialized = new Promise(async (res, rej) => {
      if (!getDb()) { await openDb() }
      this.create().then(() => res(true)).catch(rej)
    })
  }

  create(overwrite = false) {
    return services.reset(getDb(), { [this.title]: this.schema }, overwrite).then(() => ({ success: true }))
  }
    
  get(id = null, idKey = 'id') {
    if (!id) return services.all(getDb(), `SELECT * FROM ${this.title}`)
    return services.get(getDb(), `SELECT * FROM ${this.title} WHERE ${idKey} = ?`, [id])
  }

  count(id = null, idKey = 'id') {
    return services.get(getDb(),
      `SELECT COUNT(*) cnt FROM ${this.title}${id ? ` WHERE ${idKey} = ?` : ''}`,
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
    ).then((row) => row && row.id)
  }
    
  update(id, data, idKey = 'id') {
    if (!id) return Promise.reject(errors.noID())

    data = services.sanitizeSchemaData(data, this.schema)
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject(errors.noData())

    return this.count(id, idKey).then((exists) => {
      if (!exists) throw errors.noEntry(id)

      return services.run(getDb(), 
        `UPDATE ${this.title} SET ${ keys.map(k => k+' = ?').join(', ') } WHERE ${idKey} = ?`,
        [...Object.values(data), id]
      )
    }).then(() => ({ success: true }))
  }
  
  remove(id, idKey = 'id') {
    if (!id) return Promise.reject(errors.noID())

    return this.count(id, idKey).then((exists) => {
      if (!exists) throw errors.noEntry(id)
      
      return services.run(getDb(), `DELETE FROM ${this.title} WHERE ${idKey} = ?`, [id])
    }).then(() => ({ success: true }))
  }
}

module.exports = Model
