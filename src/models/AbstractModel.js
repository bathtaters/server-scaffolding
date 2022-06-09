const { openDb, getDb } = require('../config/db')
const services = require('../services/db.services')

class AbstractModel {

  constructor(title, schema) {
    if (!schema.id) schema.id = 'INTEGER PRIMARY KEY'

    this.title = title.toLowerCase()
    this.schema = services.sanitizeSchemaData(schema)

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
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject(new Error('No valid data provided'))
  
    return services.get(getDb(), 
      `INSERT INTO ${this.title}(${ keys.join(', ') }) VALUES(${ keys.map(()=>'?').join(', ') }) RETURNING id`,
      Object.values(data)
    ).then((row) => row && row.id)
  }
    
  update(id, data, idKey = 'id') {
    if (!id) return Promise.reject(new Error('No ID provided'))

    data = services.sanitizeSchemaData(data, this.schema)
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject(new Error('No valid data provided'))

    return this.count(id, idKey).then((exists) => {
      if (!exists) throw new Error('ID not found: '+id)

      return services.run(getDb(), 
        `UPDATE ${this.title} SET ${ keys.map(k => k+' = ?').join(', ') } WHERE ${idKey} = ?`,
        [...Object.values(data), id]
      )
    }).then(() => ({ success: true }))
  }
  
  remove(id, idKey = 'id') {
    if (!id) return Promise.reject(new Error('No ID provided'))

    return this.count(id, idKey).then((exists) => {
      if (!exists) throw new Error('ID not found: '+id)
      
      return services.run(getDb(), `DELETE FROM ${this.title} WHERE ${idKey} = ?`, [id])
    }).then(() => ({ success: true }))
  }
}

module.exports = AbstractModel
