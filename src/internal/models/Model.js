const { openDb, getDb } = require('../libs/db')
const services = require('../services/db.services')
const { sanitizeSchemaData, schemaFromTypes, boolsFromTypes, appendAndSort, adaptersFromTypes } = require('../utils/db.utils')
const { hasDupes, caseInsensitiveObject } = require('../utils/common.utils')
const errors = require('../config/errors.internal')
const { parseBoolean } = require('../utils/validate.utils')
const parseBool = parseBoolean(true)

/** Base class for creating Database Models */
class Model {

  /**
   * Creates a new database model and loads it into the database
   * @param  {string} title - Name of database table
   * @param  {ModelOptions} options - Additional options
   */
  constructor(title, { types, limits, defaults, primaryId = 'id', getAdapter, setAdapter, sqlSchema } = {}) {
    if (!types && !sqlSchema) throw new Error(`${title} must be provided a Schema or Types object.`)

    if (typeof sqlSchema === 'function') sqlSchema = sqlSchema(schemaFromTypes(types, primaryId))
    else sqlSchema = Object.assign(schemaFromTypes(types, primaryId), sqlSchema || {})

    if (!sqlSchema || !Object.keys(sqlSchema).length) throw new Error(`Schema for ${title} was unable to be created or has no entries.`)
    if (hasDupes(Object.keys(sqlSchema).map((k) => k.toLowerCase())))
      throw new Error(`Schema for ${title} contains duplicate key names: ${Object.keys(sqlSchema).join(', ')}`)

    if (!sqlSchema[primaryId]) sqlSchema[primaryId] = 'INTEGER PRIMARY KEY'
    if (types && !types[primaryId]) types[primaryId] = 'int'

    const adaptDefs = types && (!getAdapter || !setAdapter) && adaptersFromTypes(types)

    this.title = title
    this.schema = sanitizeSchemaData(sqlSchema)
    this.defaults = defaults
    this.types = types
    this.limits = limits
    this.primaryId = primaryId
    this.bitmapFields = []
    this.boolFields = boolsFromTypes(types)
    this.getAdapter = typeof getAdapter === 'function' ? getAdapter : getAdapter == null ? adaptDefs.getAdapter : null
    this.setAdapter = typeof setAdapter === 'function' ? setAdapter : setAdapter == null ? adaptDefs.setAdapter : null

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
    ).then((res) => res.map(caseInsensitiveObject))

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
    params).then((res) => res.map(caseInsensitiveObject))

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
  
    return services.getLastId(getDb(),
      `INSERT INTO ${this.title}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`,
      Object.values(data)
    )
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
      .then((res) => res.map(caseInsensitiveObject))
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


// JSDOC TYPES

/**
 * Callback that takes in a single piece of data and returns a modified version of that data
 * @callback Adapter
 * @param {Object} data - input data
 * @returns {Object} updated data
 */

/**
 * Model options object
 * (Requires at least one of types OR sqlSchema is entered)
 * @typedef  {Object} ModelOptions
 * @property {Object.<string,string>} types - Object of column types
 *   - { [columnKey]: (colType) }
 *   - (colType) = string, uuid, b64[url], hex, date, datetime, boolean, int, float, object, any
 *   - (colType)[] = array of (colType)
 *   - (colType)? = column is optional
 *   - string* = allow symbols/spaces in string
 * @property {Object.<string,import('../validators/shared.validators').Limits>} [limits] - Object of column limits
 *   - { [columnKey]: { columnLimits } }
 *   - Sets limits on numbers, string length or array size
 * @property {Object.<string,any>} [defaults] - Object of column defaults
 *   - { [columnKey]: defaultValue }
 *   - Default value to use for that column if nothing provided on creation 
 * @property {string} [primaryId=id] - columnKey for SQL primary key
 *   - If not in type will be added as auto-incrementing INT
 *   - default: 'id'
 * @property {Adapter} [getAdapter] - Function called on every row retrieved from the database (ie. get)
 *   - INPUT: Row as an object
 *   - RETURN: Passed to user when calling a retrieve method
 *   - default: Converts data based on Model.types
 * @property {Adapter} [setAdapter] - Function called on every object before it is stored in the database (ie. add/update)
 *   - INPUT: Data object called with a set method 
 *   - REUTRN: Row object to be inserted/updated in the database
 *   - default: Converts data based on Model.types
 * @property {Object.<string,string>|Adapter} [sqlSchema] - Can be an Object or Function for helping create the SQL Table
 *   - OBJECT: { [columnKey]: 'SQL TYPE' }, this will override the schema auto-generated from Model.types
 *   - FUNCTION: called on the auto-generated SQL schema before the table is created
 *   - - input object will be like OBJECT (above)
 *   - - return should be of the same form
 */