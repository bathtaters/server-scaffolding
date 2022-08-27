const { openDb, getDb } = require('../libs/db')
const services = require('../services/db.services')
const { getPrimaryIdAndAdaptSchema, runAdapters } = require('../services/model.services')
const { checkInjection, appendAndSort } = require('../utils/db.utils')
const { caseInsensitiveObject, filterByField } = require('../utils/common.utils')
const { isBool, sanitizeSchemaData } = require('../utils/model.utils')
const { parseBoolean } = require('../utils/validate.utils')
const { adapterKey, ifExistsBehavior } = require('../config/models.cfg')
const parseBool = parseBoolean(true)
const errors = require('../config/errors.engine')

/** Base class for creating Database Models */
class Model {

  /**
   * Creates a new database model and initializes it into the database
   * @param  {string} title - Name of database table
   * @param  {Object.<string,ModelDefinition>} definitions - All Model keys and their definitions
   */
  constructor(title, definitions) {
    if (!definitions) throw new Error(`${title} must be provided a definitions object.`)

    this.title = title
    this.primaryId = getPrimaryIdAndAdaptSchema(definitions, this.title)
    this.schema = definitions

    this.isInitialized = new Promise(async (res, rej) => {
      if (!getDb()) { await openDb() }
      this.create().then((r) => r.success ? res(true) : rej(r)).catch(rej)
    })
  }
  
  create(overwrite = false) {
    const dbSchema = { [this.title]: filterByField(this.schema, 'db') }
    return services.reset(getDb(), dbSchema, overwrite).then(() => ({ success: true }))
  }
    

  async get(id = null, idKey = null, raw = false) {
    let result
    if (id == null)
      result = await services.all(getDb(), `SELECT * FROM ${this.title}`)

    else if (idKey && !Object.keys(this.schema).includes(idKey)) throw errors.badKey(idKey, this.title)
    else
      result = await services.get(getDb(), `SELECT * FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`, [id])

    result = Array.isArray(result) ? result.map(caseInsensitiveObject) : caseInsensitiveObject(result)
    if (raw) return result
    return Array.isArray(result) ?
      Promise.all(result.map((data) => runAdapters(adapterKey.get, data, this.schema, this.hidden))) :
      result && runAdapters(adapterKey.get, result, this.schema, this.hidden)
  }


  async getPage(page, size, reverse = null, orderKey = null) {
    if (!size) return Promise.reject(errors.noSize())
    if (orderKey && !Object.keys(this.schema).includes(orderKey)) throw errors.badKey(orderKey, this.title)

    const sort = reverse == null && !orderKey ? '' : `ORDER BY ${orderKey || this.primaryId} ${reverse ? 'DESC' : 'ASC'} `

    const result = await services.all(getDb(), 
      `SELECT * FROM ${this.title} ${sort}LIMIT ? OFFSET ?`,
      [size, (page - 1) * size]
    ).then((res) => res.map(caseInsensitiveObject))

    return Promise.all(result.map((data) => runAdapters(adapterKey.get, data, this.schema, this.hidden)))
  }


  async find(matchData, partialMatch = false) {
    matchData = await runAdapters(adapterKey.set, matchData, this.schema)
    matchData = sanitizeSchemaData(matchData, this.schema)

    const searchData = Object.entries(matchData)
    if (!searchData.length) throw errors.noData()

    let text = [], params = []
    searchData.forEach(([key,val]) => {
      if (!partialMatch) {
        text.push(`${key} = ?`)
        return params.push(val)
        
      } if (this.schema[key].isBitmap) {
        val = +val
        text.push(`${key} ${val ? '&' : '='} ?`)
        return params.push(val)

      } if (isBool(this.schema[key])) {
        val = +parseBool(val)
        text.push(`${key} = ?`)
        return params.push(val)

      } if (typeof val === 'string') {
        text.push(`${key} LIKE ?`)
        return params.push(`%${val}%`)
      }
      // DEFAULT
      text.push(`${key} = ?`)
      if (!val || typeof val === 'number') params.push(val)
      else params.push(JSON.stringify(val))
    })
    
    const result = await services.all(getDb(), 
      `SELECT * FROM ${this.title} WHERE ${text.join(' AND ')}`,
    params).then((res) => res.map(caseInsensitiveObject))

    return Promise.all(result.map((data) => runAdapters(adapterKey.get, data, this.schema, this.hidden)))
  }


  async count(id = null, idKey = null) {
    if (idKey && !Object.keys(this.schema).includes(idKey)) throw errors.badKey(idKey, this.title)
    
    const filter = id != null ? ` WHERE ${idKey || this.primaryId} = ?` : ''
    const result = await services.get(getDb(),
      `SELECT COUNT(*) c FROM ${this.title}${filter}`,
      id != null ? [id] : []
    )
    return result && result.c
  }
  
  
  add(data, ifExists = 'default') {
    return this.batchAdd([data], ifExists, true)
  }

  
  async batchAdd(dataArray, ifExists = 'default', returns = false) { // skip/overwrite/abort
    dataArray = await Promise.all(dataArray.map((data) => runAdapters(adapterKey.set, { ...this.defaults, ...data }, this.schema)))
    dataArray = dataArray.map((data) => sanitizeSchemaData(data, this.schema))
    
    const keys = Object.keys(dataArray[0])
    if (!keys.length) throw errors.noData()

    return services[returns ? 'getLastEntry' : 'run'](getDb(),
      `INSERT${ifExistsBehavior[ifExists] ?? ifExistsBehavior.default} INTO ${this.title}(${
        keys.join(',')
      }) VALUES ${
        dataArray.map(() => `(${keys.map(() => '?').join(',')})`).join(',')
      }`,
      dataArray.flatMap((data) => keys.map((key) => data[key])),
      returns && this.title,
    ).then((ret) => returns ? ret : { success: true })
  }
   
  
  async update(id, data, idKey = null, onChangeCb = null) {
    if (id == null) throw errors.noID()

    data = await runAdapters(adapterKey.set, data, this.schema)
    data = sanitizeSchemaData(data, this.schema)
    if (!Object.keys(data).length) throw errors.noData()

    const current = await this[onChangeCb ? 'get' : 'count'](id, idKey, true)
    if (!current) throw errors.noEntry(id)

    if (onChangeCb) {
      const updated = await onChangeCb(data, current)
      if (updated) data = updated
      data = sanitizeSchemaData(data, this.schema)
      if (!Object.keys(data).length) throw errors.noData()
    }
    
    await services.run(getDb(),
      `UPDATE ${this.title} SET ${Object.keys(data).map(k => `${k} = ?`).join(', ')} WHERE ${idKey || this.primaryId} = ?`,
      [...Object.values(data), id]
    )
    return { success: true }
  }
  
  
  async remove(id, idKey = null) {
    if (id == null) return Promise.reject(errors.noID())

    const count = await this.count(id, idKey)
    if (!count) throw errors.noEntry(id)

    await services.run(getDb(),
      `DELETE FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`,
    [id])
    return { success: true }
  }


  async custom(sql, params, raw = true) {
    /* WARNING!! SQL CANNOT BE CHECKED FOR INJECTION */
    const result = await services.all(getDb(), sql, params)
      .then((res) => res.map(caseInsensitiveObject))
    if (raw) return result
    return Promise.all(result.map((data) => runAdapters(adapterKey.get, data, this.schema, this.hidden)))
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

  // Check for injection on set
  get title() { return this._title }
  set title(newTitle) { this._title = checkInjection(newTitle) }
  get primaryId() { return this._primaryId }
  set primaryId(newId) { this._primaryId = checkInjection(newId, this.title) }
  get hidden() { return this._hidden }
  get defaults() { return this._defaults }
  get schema() { return this._schema }
  set schema(newSchema) {
    this._schema = checkInjection(newSchema, this.title)
    this._defaults = filterByField(newSchema, 'default')
    this._hidden = Object.keys(newSchema).filter((key) => newSchema[key].dbOnly)
  }
}

module.exports = Model


// JSDOC TYPES

/**
 * Callback that takes in a single piece of data and returns a modified version of that data
 * @callback Adapter
 * @param {any} value - input value
 * @param {Object} data - full input object
 * @returns {Object} updated input value
 */

/**
 * Model definitions object
 * @typedef  {Object} ModelDefinition
 * @property {string} typeStr - Column type (full string)
 *   - Can be: string, uuid, b64[url], hex, date, datetime, boolean, int, float, object, any
 *   - (type)[] = array of (type)
 *   - (type)? = column is optional
 *   - string* = allow symbols/spaces in string
 * @property {import('../validators/shared.validators').Limits} [limits] - Object of column limits
 *   - { min?, max? } | { array: { min?, max? }, elem: { min?, max? } }
 *   - Sets limits on numbers, string length or array size
 * @property {any} [default] - Default value
 *   - Default value to use for that column if nothing provided on creation 
 *   - This value is run through setAdapter each time
 * @property {boolean} [isPrimary] - if column is SQL primary key
 *   - When no type/typeStr is provided, it will be set as auto-incrementing Int
 * @property {Adapter} [getAdapter] - Function called whenever this column is retrieved from the database
 *   - INPUT: Column value for row, Entire row as an object
 *   - RETURN: Updated column value for user
 *   - default: Converts data based on type
 * @property {Adapter} [setAdapter] - Function called whenever this column is stored in the database (ie. add/update)
 *   - INPUT: Column value for row, Entire row as an object
 *   - RETURN: Updated column value for database
 *   - default: Converts data based on type
 * @property {string} [html] - Type property for HTML <input> tag in user form
 *   - falsy value = column is only in database (Not accessible via UI)
 *   - default: property is auto-generated based on type
 * @property {string} [db] - Type of schema for this column in database
 *   - falsy value = column is not in database (Only for UI validation)
 *   - default: schema is auto-generated based on type
 * @property {boolean} [dbOnly] - If column is internal to database only
 *   - Truthy value will obscure column from non-raw get results
 * @property {string} [type] - Column base type (w/o suffixes)
 *   - default: parsed from typeStr
 * @property {boolean} [isOptional] - If column can be empty
 *   - default: parsed from typeStr
 * @property {boolean} [isArray] - If column is an array of <type>
 *   - default: parsed from typeStr
 * @property {boolean} [hasSpaces] - If a string column will allow spaces & special characters
 *   - default: parsed from typeStr
 */