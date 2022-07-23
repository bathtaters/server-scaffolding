const { openDb, getDb } = require('../libs/db')
const services = require('../services/db.services')
const { sanitizeSchemaData, schemaFromTypes, boolsFromTypes, appendAndSort } = require('../utils/db.utils')
const { types: configTypes, defaults: configDefaults, limits: configLimits } = require('../../config/models.cfg')
const { hasDupes, caseInsensitiveObject } = require('../utils/common.utils')
const errors = require('../config/errors.internal')
const { deepUnescape, parseBoolean } = require('../utils/validate.utils')
const parseBool = parseBoolean(true)

class Model {

  constructor(title, { sqlSchema, types, defaults, limits, primaryId = 'id', getAdapter, setAdapter } = {}) {
    if (types == null) types = configTypes[title]

    if (typeof sqlSchema === 'function') sqlSchema = sqlSchema(schemaFromTypes(types, primaryId), types, primaryId, title)
    else if (!sqlSchema) sqlSchema = schemaFromTypes(types, primaryId)
    if (!sqlSchema) throw new Error(`Schema for ${title} not provided and does not exist in models.cfg.`)
    if (hasDupes(Object.keys(sqlSchema).map((k) => k.toLowerCase())))
      throw new Error(`Schema for ${title} contains duplicate key names: ${Object.keys(sqlSchema).join(', ')}`)

    if (!sqlSchema[primaryId]) sqlSchema[primaryId] = 'INTEGER PRIMARY KEY'

    this.title = title
    this.schema = sanitizeSchemaData(sqlSchema)
    this.defaults = defaults != null ? defaults : configDefaults[title]
    this.limits = limits != null ? limits : configLimits[title]
    this.primaryId = primaryId
    this.bitmapFields = []
    this.boolFields = boolsFromTypes(types)
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
    result = Array.isArray(result) ? result.map(caseInsensitiveObject) : caseInsensitiveObject(result)
    if (raw || !this.getAdapter) return result
    return Array.isArray(result) ? result.map(this.getAdapter) : result && this.getAdapter(result)
  }


  async getPage(page, size, reverse = null, orderKey = null) {
    if (!size) return Promise.reject(errors.noSize())

    const sort = reverse == null && !orderKey ? '' :
      `ORDER BY ${orderKey || this.primaryId} ${reverse ? 'DESC' : 'ASC'} `

    const result = await services.all(getDb(), 
      `SELECT * FROM ${this.title} ${sort}LIMIT ${size} OFFSET ${(page - 1) * size}`
    ).then((res) => deepUnescape(res).map(caseInsensitiveObject))

    return this.getAdapter ? result.map(this.getAdapter) : result
  }


  async find(matchData, partialMatch = false) {
    if (this.setAdapter) matchData = await this.setAdapter(matchData)
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

      } if (this.boolFields.includes(key)) {
        val = +parseBool(val)
        text.push(`${key} = ?`)
        return params.push(val)

      } if (typeof val === 'string') {
        text.push(`${key} LIKE ?`)
        return params.push(`%${val}%`)

      } if (typeof val === 'number') {
        text.push(`${key} = ?`)
        return params.push(val)
      } // Force exact match for numbers
      throw errors.badPartial(`${typeof val} (${key})`)
    })
    
    const result = await services.all(getDb(), 
      `SELECT * FROM ${this.title} WHERE ${text.join(' AND ')}`,
    params).then((res) => deepUnescape(res).map(caseInsensitiveObject))

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
  
  
  async add(data) {
    if (this.setAdapter) data = await this.setAdapter(data)
    data = sanitizeSchemaData(data, this.schema)
    if (this.defaults) data = { ...this.defaults, ...data }
    
    const keys = Object.keys(data)
    if (!keys.length) return Promise.reject(errors.noData())
  
    const result = await services.getLastId(getDb(),
      `INSERT INTO ${this.title}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`,
      Object.values(data)
    )
    return deepUnescape(result)
  }
   
  
  async update(id, data, idKey = null, onChangeCb = null) {
    if (id == null) throw errors.noID()

    if (this.setAdapter) data = await this.setAdapter(data)
    data = sanitizeSchemaData(data, this.schema)
    if (!Object.keys(data).length) throw errors.noData()

    const current = await this[onChangeCb ? 'get' : 'count'](id, idKey, true)
    if (!current) throw errors.noEntry(id)

    if (onChangeCb) {
      const updated = await onChangeCb(data, current)
      if (updated) data = updated
    }
      
    await services.run(getDb(),
      `UPDATE ${this.title} SET ${Object.keys(data).map(k => `${k} = ?`).join(', ')} WHERE ${idKey || this.primaryId} = ?`,
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
    const result = await services.all(getDb(), sql, params)
      .then((res) => deepUnescape(res).map(caseInsensitiveObject))
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
