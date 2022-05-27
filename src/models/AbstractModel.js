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
    return services.reset(getDb(), { [this.title]: this.schema }, overwrite)
  }
    
  get(id = null) {
    if (!id) return services.all(getDb(), `SELECT * FROM ${this.title}`)
    return services.get(getDb(), `SELECT * FROM ${this.title} WHERE id = ?`, [id])
  }
    
  add(data) {
    data = services.sanitizeSchemaData(data, this.schema)
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject('No valid data to add')
  
    return services.get(getDb(), 
      `INSERT INTO ${this.title}(${ keys.join(', ') }) VALUES(${ keys.map(()=>'?').join(', ') }) RETURNING id`,
      Object.values(data)
    ).then((row) => row && row.id)
  }
    
  update(id, data) {
    data = services.sanitizeSchemaData(data, this.schema)
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject('No valid data to update')
  
    return services.run(getDb(), 
      `UPDATE ${this.title} SET ${ keys.map(k => k+' = ?').join(', ') } WHERE id = ?`,
      [...Object.values(data), id]
    )
  }
  
  remove(id) {
    return services.run(getDb(), `DELETE FROM ${this.title} WHERE id = ?`, [id])
  }
}

module.exports = AbstractModel
