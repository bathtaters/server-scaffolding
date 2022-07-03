const { openDb, getDb } = require('../config/db')
const services = require('../services/db.services')
const { sanitizeSchemaData, schemaFromConfig, appendAndSort } = require('../utils/db.utils')
const { defaults: configDefaults, limits: configLimits } = require('../../config/models.cfg')
const { hasDupes } = require('../utils/common.utils')
const errors = require('../config/errors.internal')
const { deepUnescape } = require('../utils/validate.utils')

class Model {

  constructor(title, { schema, defaults, limits, primaryId = 'id', getAdapter, setAdapter } = {}) {
    if (!schema) schema = schemaFromConfig(title, primaryId)
    if (typeof schema === 'function') schema = schema(schemaFromConfig(title, primaryId), title, primaryId)

    if (!schema) throw new Error(`Schema for ${title} not provided and does not exist in validation.json.`)
    if (hasDupes(Object.keys(schema).map((k) => k.toLowerCase()))) throw new Error(`Schema for ${title} contains duplicate key names: ${Object.keys(schema).join(', ')}`)

    if (!schema[primaryId]) schema[primaryId] = 'INTEGER PRIMARY KEY'

    this.title = title
    this.schema = sanitizeSchemaData(schema)
    this.defaults = defaults != null ? defaults : configDefaults[title]
    this.limits = limits != null ? limits : configLimits[title]
    this.primaryId = primaryId
    this.bitmapFields = []
    this.getAdapter = typeof getAdapter === 'function' ? getAdapter : null
    this.setAdapter = typeof setAdapter === 'function' ? setAdapter : null

    this.isInitialized = new Promise(async (res, rej) => {
      if (!getDb()) { await openDb() }
      this.create().then((r) => r.success ? res(true) : rej(r)).catch(rej)
    })
  }

  
  create(overwrite = false) {
    return services.reset(getDb(), { [this.title]: this.schema }, overwrite).then(() => ({ success: true }))
  }
    

  async get(id = null, idKey = null, raw = false) {
    let result
    if (id == null)
      result = await services.all(getDb(), `SELECT * FROM ${this.title}`)
    
    else
      result = await services.get(getDb(),
        `SELECT * FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`,
      [id])

    result = deepUnescape(result)
    if (raw || !this.getAdapter) return result
    return Array.isArray(result) ? result.map(this.getAdapter) : result && this.getAdapter(result)
  }


  async getPage(page, size, reverse = null, orderKey = null) {
    if (!size) return Promise.reject(errors.noSize())

    const sort = reverse == null && !orderKey ? '' :
      `ORDER BY ${orderKey || this.primaryId} ${reverse ? 'DESC' : 'ASC'} `

    const result = await services.all(getDb(), 
      `SELECT * FROM ${this.title} ${sort}LIMIT ${size} OFFSET ${(page - 1) * size}`
    ).then(deepUnescape)

    return this.getAdapter ? result.map(this.getAdapter) : result
  }


  async find(matchData, partialMatch = false) {
    if (this.setAdapter) matchData = this.setAdapter(matchData)
    matchData = sanitizeSchemaData(matchData, this.schema)

    const searchData = Object.entries(matchData)
    if (!searchData.length) throw errors.noData()

    let text = [], params = []
    searchData.forEach(([key,val]) => {
      if (!partialMatch) {
        text.push(`${key} = ?`)
        return params.push(val)
        
      } if (this.bitmapFields.includes(key)) {
        val = +val
        text.push(`${key} ${val ? '&' : '='} ?`)
        return params.push(val)

      } if (typeof val === 'string') {
        text.push(`${key} LIKE ?`)
        return params.push(`%${val}%`)
      }
      throw errors.badPartial(`${typeof val} (${key})`)
    })
    
    const result = await services.all(getDb(), 
      `SELECT * FROM ${this.title} WHERE ${text.join(' AND ')}`,
    params).then(deepUnescape)

    return this.getAdapter ? result.map(this.getAdapter) : result
  }


  async count(id = null, idKey = null) {
    const filter = id != null ? ` WHERE ${idKey || this.primaryId} = ?` : ''
    const result = await services.get(getDb(),
      `SELECT COUNT(*) c FROM ${this.title}${filter}`,
      id != null ? [id] : []
    )
    return result && result.c
  }
  
  
  async add(data, returnField) {
    if (this.setAdapter) data = this.setAdapter(data)
    data = sanitizeSchemaData(data, this.schema)
    if (this.defaults) data = { ...this.defaults, ...data }
    
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject(errors.noData())

    if (!returnField) returnField = this.primaryId.toLowerCase()
  
    const result = await services.get(getDb(),
      `INSERT INTO ${this.title}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')}) RETURNING ${returnField}`,
      Object.values(data)
    )
    return deepUnescape(result && result[returnField])
  }
   
  
  async update(id, data, idKey = null) {
    if (id == null) return Promise.reject(errors.noID())

    if (this.setAdapter) data = this.setAdapter(data)
    data = sanitizeSchemaData(data, this.schema)
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject(errors.noData())

    const count = await this.count(id, idKey || this.primaryId)
    if (!count) throw errors.noEntry(id)
      
    await services.run(getDb(),
      `UPDATE ${this.title} SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE ${idKey || this.primaryId} = ?`,
      [...Object.values(data), id]
    )
    return { success: true }
  }
  
  
  async remove(id, idKey = null) {
    if (id == null) return Promise.reject(errors.noID())

    const count = await this.count(id, idKey || this.primaryId)
    if (!count) throw errors.noEntry(id)

    await services.run(getDb(),
      `DELETE FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`,
    [id])
    return { success: true }
  }


  async custom(sql, params, raw = true) { 
    const result = await services.all(getDb(), sql, params).then(deepUnescape)
    if (raw || !this.getAdapter) return result
    return result.map(this.getAdapter)
  }

  
  async getPaginationData({ page, size }, { defaultSize = 5, sizeList = [], startPage = 1 } = {}) {
    const total = await this.count()
    
    size = +(size || defaultSize)
    const pageCount = Math.ceil(total / size)
    page = Math.max(1, Math.min(+(page || startPage), pageCount))
    
    const data = await this.getPage(page, size)
  
    return {
      data, page, pageCount, size,
      sizes: (pageCount > 1 || total > Math.min(...sizeList)) && appendAndSort(sizeList, size),
    }
  }
}

module.exports = Model
