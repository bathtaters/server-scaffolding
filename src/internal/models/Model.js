const { openDb, getDb } = require('../config/db')
const services = require('../services/db.services')
const { sanitizeSchemaData, schemaFromValidate, appendAndSort } = require('../utils/db.utils')
const { defaults: validateDefaults, limits: validateLimits } = require('../../config/models.cfg')
const { hasDupes } = require('../utils/common.utils')
const errors = require('../config/errors.internal')

class Model {

  constructor(title, { schema, defaults, limits, primaryId = 'id' } = {}) {
    if (!schema) schema = schemaFromValidate(title, primaryId)
    if (typeof schema === 'function') schema = schema(schemaFromValidate(title, primaryId), title, primaryId)

    if (!schema) throw new Error(`Schema for ${title} not provided and does not exist in validation.json.`)
    if (hasDupes(Object.keys(schema).map((k) => k.toLowerCase()))) throw new Error(`Schema for ${title} contains duplicate key names: ${Object.keys(schema).join(', ')}`)

    if (!schema[primaryId]) schema[primaryId] = 'INTEGER PRIMARY KEY'

    this.title = title
    this.schema = sanitizeSchemaData(schema)
    this.defaults = defaults != null ? defaults : validateDefaults[title]
    this.limits = limits != null ? limits : validateLimits[title]
    this.primaryId = primaryId
    this.bitmapFields = []

    this.isInitialized = new Promise(async (res, rej) => {
      if (!getDb()) { await openDb() }
      this.create().then(() => res(true)).catch(rej)
    })
  }

  create(overwrite = false) {
    return services.reset(getDb(), { [this.title]: this.schema }, overwrite).then(() => ({ success: true }))
  }
    
  get(id = null, idKey = null) {
    if (id == null) return services.all(getDb(), `SELECT * FROM ${this.title}`)
    return services.get(getDb(), `SELECT * FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`, [id])
  }

  getPage(page, size, reverse = null, orderKey = null) {
    if (!size) return Promise.reject(errors.noSize())
    const sort = reverse == null && !orderKey ? '' : `ORDER BY ${orderKey || this.primaryId} ${reverse ? 'DESC' : 'ASC'} `
    return services.all(getDb(), `SELECT * FROM ${this.title} ${sort}LIMIT ${size} OFFSET ${(page - 1) * size}`)
  }

  find(matchData, partialMatch = false) {

    matchData = sanitizeSchemaData(matchData, this.schema)
    const searchData = Object.entries(matchData)
    if (!searchData.length) return Promise.reject(errors.noData())

    let text = [], params = []
    searchData.forEach(([key,val]) => {
      if (!partialMatch) {
        text.push(`${key} = ?`);    params.push(val)
        
      } else if (this.bitmapFields.includes(key)) {
        val = +val
        text.push(`${key} ${val ? '&' : '='} ?`)
        params.push(val)

      } else {
        text.push(`${key} LIKE ?`); params.push(`%${val}%`)
      }
    })

    return services.all(getDb(), `SELECT * FROM ${this.title} WHERE ${text.join(' AND ')}`, params)
  }

  count(id = null, idKey = null) {
    return services.get(getDb(),
      `SELECT COUNT(*) cnt FROM ${this.title}${id != null ? ` WHERE ${idKey || this.primaryId} = ?` : ''}`,
      id != null ? [id] : []
    ).then((count) => count && count.cnt)
  }
    
  add(data, returnField) {
    data = sanitizeSchemaData(data, this.schema)
    if (this.defaults) data = { ...this.defaults, ...data }
    
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject(errors.noData())

    if (!returnField) returnField = this.primaryId.toLowerCase()
  
    return services.get(getDb(), 
      `INSERT INTO ${this.title}(${ keys.join(', ') }) VALUES(${ keys.map(()=>'?').join(', ') }) RETURNING ${returnField}`,
      Object.values(data)
    ).then((row) => row && row[returnField])
  }
    
  update(id, data, idKey = null) {
    if (id == null) return Promise.reject(errors.noID())

    data = sanitizeSchemaData(data, this.schema)
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
    if (id == null) return Promise.reject(errors.noID())

    return this.count(id, idKey || this.primaryId).then((exists) => {
      if (!exists) throw errors.noEntry(id)
      
      return services.run(getDb(), `DELETE FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`, [id])
    }).then(() => ({ success: true }))
  }

  custom(sql, params) { return services.all(getDb(), sql, params) }

  async getPaginationData({ page, size }, { defaultSize = 5, minSize, sizeList = [], startPage = 1 } = {}) {
    const total = await this.count()
    
    size = +(size || defaultSize)
    const pageCount = Math.ceil(total / size)
    page = Math.max(1, Math.min(+(page || startPage), pageCount))
    if (typeof minSize !== 'number') minSize = Math.min(...sizeList)
  
    const data = await this.getPage(page, size)
  
    return {
      data, page, pageCount, size,
      sizes: (pageCount > 1 || total > minSize) && appendAndSort(sizeList, size),
    }
  }
}

module.exports = Model
