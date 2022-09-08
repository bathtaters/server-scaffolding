const { openDb, getDb } = require('../libs/db')
const services = require('../services/db.services')
const { getPrimaryIdAndAdaptSchema, runAdapters, extractArrays } = require('../services/model.services')
const { checkInjection, appendAndSort, getArrayJoin } = require('../utils/db.utils')
const { caseInsensitiveObject, filterByField } = require('../utils/common.utils')
const { isBool, sanitizeSchemaData, arrayTableRefs } = require('../utils/model.utils')
const { parseBoolean } = require('../utils/validate.utils')
const { adapterKey, ifExistsBehavior, arrayLabel, getArrayName, getArrayPath, CONCAT_DELIM } = require('../config/models.cfg')
const errors = require('../config/errors.engine')

const parseBool = parseBoolean(true)
const entryKeys = [arrayLabel.foreignId, arrayLabel.index, arrayLabel.entry]

/** Base class for creating Database Models */
class Model {

  /**
   * Creates a new database model and initializes it into the database
   * @param  {string} title - Name of database table
   * @param  {Object.<string,ModelDefinition>} definitions - All Model keys and their definitions
   */
  constructor(title, definitions, isArrayTable = false) {
    if (!definitions) throw new Error(`${title} must be provided a definitions object.`)

    this._isArrayTable = isArrayTable
    if (this.isArrayTable) this._title = title
    else this.title = title

    this.primaryId = getPrimaryIdAndAdaptSchema(definitions, this.title, this.isArrayTable)
    this.schema = definitions

    this.isInitialized = (async () => {
      if (!getDb()) { await openDb() }
      return this.create().then((r) => r.success)
    })()
  }
  

  async create(overwrite) {
    let dbSchema = { [this.title]: filterByField(this.schema, 'db') },
      indexes = {}, refs = {}
    
    if (!this.isArrayTable) Object.keys(this.arrays).forEach((key) => {
      const table = getArrayName(this.title, key)
      dbSchema[table] = filterByField(this.arrays[key], 'db')
      indexes[table]  = [arrayLabel.foreignId, arrayLabel.index]
      refs[table] = arrayTableRefs(this)
    })
    
    await services.reset(getDb(), dbSchema, overwrite, indexes, refs)
    return { success: true }
  }

  getArrayTable(arrayKey) {
    return new Model(getArrayName(this.title, arrayKey), this.arrays[arrayKey], true)
  }

  async get(id = null, idKey = null, raw = false, skipArrays = false) {
    const arrays = skipArrays ? [] : Object.keys(this.arrays)

    const idIsArray = idKey && arrays.includes(idKey)
    if (idKey && !idIsArray && !Object.keys(this.schema).includes(idKey)) throw errors.badKey(idKey, this.title)

    const sql = getArrayJoin(this, arrays, { id, idKey, idIsArray })
    const result = await (id == null ?
      services.all(getDb(), sql).then((res) => res.map(caseInsensitiveObject)) :
      services.get(getDb(), sql, [Array.isArray(id) ? id.join(CONCAT_DELIM) : id]).then((res) => caseInsensitiveObject(res))
    )

    return raw ? result : Array.isArray(result) ?
      Promise.all(result.map((data) => runAdapters(adapterKey.get, data, this))) :
      result && runAdapters(adapterKey.get, result, this)
  }


  async getPage(page, size, reverse = null, orderKey = null) {
    if (!size) return Promise.reject(errors.noSize())
    if (orderKey && !Object.keys(this.schema).includes(orderKey)) throw errors.badKey(orderKey, this.title)

    const sql = `${getArrayJoin(this, Object.keys(this.arrays))} ${
      reverse == null && !orderKey ? '' : `ORDER BY ${this.title}.${orderKey || this.primaryId} ${reverse ? 'DESC' : 'ASC'} `
    }LIMIT ? OFFSET ?`
    
    const result = await services.all(getDb(), sql, [size, (page - 1) * size])
      .then((res) => res.map(caseInsensitiveObject))

    return Promise.all(result.map((data) => runAdapters(adapterKey.get, data, this)))
  }


  async find(matchData, partialMatch = false, orderKey = null, raw = false) {
    matchData = await runAdapters(adapterKey.set, matchData, this)
    matchData = sanitizeSchemaData(matchData, this)

    const searchData = Object.entries(matchData)
    searchData.forEach(([key]) => {
      if (key in this.arrays) throw new Error(`Array search not implemented: ${key} in query.`)
    })
    if (!searchData.length) throw errors.noData()

    let text = [], params = []
    searchData.forEach(([key,val]) => {
      if (!partialMatch) {
        text.push(`${this.title}.${key} = ?`)
        return params.push(val)
        
      } if (this.schema[key].isBitmap) {
        const num = +val
        text.push(`${this.title}.${key} ${num ? '&' : '='} ?`)
        return params.push(num)

      } if (isBool(this.schema[key])) {
        text.push(`${this.title}.${key} = ?`)
        return params.push(+parseBool(val))

      } if (typeof val === 'string') {
        text.push(`${this.title}.${key} LIKE ?`)
        return params.push(`%${val}%`)
      }
      // DEFAULT
      text.push(`${this.title}.${key} = ?`)
      if (!val || typeof val === 'number') params.push(val)
      else params.push(JSON.stringify(val))
    })
    
    const result = await services.all(getDb(), 
      `${getArrayJoin(this, Object.keys(this.arrays))} WHERE ${text.join(' AND ')}${
        !orderKey ? '' : ` ORDER BY ${this.title}.${orderKey || this.primaryId}`
      }`,
    params).then((res) => res.map(caseInsensitiveObject))

    return raw ? result : Promise.all(result.map((data) => runAdapters(adapterKey.get, data, this)))
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
  
  
  add(data, ifExists = 'default') { return this.batchAdd([data], ifExists, true) }
  async batchAdd(dataArray, ifExists = 'default', returns = false) { // skip/overwrite/abort
    if (!dataArray.length) throw errors.noData('batch data')
    dataArray = await Promise.all(dataArray.map((data) => runAdapters(adapterKey.set, { ...this.defaults, ...data }, this)))
    dataArray = dataArray.map((data) => sanitizeSchemaData(data, this))
    
    const arrayKeys = Object.keys(this.arrays).filter((key) => key in dataArray[0])
    const tableKeys = Object.keys(dataArray[0]).filter((key) => !arrayKeys.includes(key))
    if (!tableKeys.length && !arrayKeys.length) throw errors.noData()

    const missingPrimary = +!tableKeys.includes(this.primaryId)

    const result = await services[returns || missingPrimary ? 'getLastEntry' : 'run'](getDb(),
      `INSERT${ifExists ? ifExistsBehavior[ifExists] : ifExistsBehavior.default} INTO ${this.title}(${
        tableKeys.join(',')
      }) VALUES ${
        dataArray.map(() => `(${tableKeys.map(() => '?').join(',')})`).join(',')
      }`,
      dataArray.flatMap((data) => tableKeys.map((key) => data[key])),
      returns && this.title,
    )
    if (!arrayKeys.length) return returns ? result : { success: true }
    
    let nextId
    if (missingPrimary && typeof result[this.primaryId] === 'number')
      nextId = result[this.primaryId] - dataArray.length

    if (missingPrimary && nextId == null) throw errors.noPrimary(table,'add')

    for (const key of arrayKeys) {
      const entries = dataArray.filter((data) => data[key] && data[key].length)
      if (!entries.length) continue

      await services.run(getDb(),
        `INSERT${ifExists ? ifExistsBehavior[ifExists] : ifExistsBehavior.default} INTO ${getArrayName(this.title, key)}(${
          entryKeys.join(',')
        }) VALUES ${
          entries.flatMap((data) => data[key].map(() => `(${entryKeys.map(() => '?').join(',')})`)).join(',')
        }`,
        entries.flatMap((data) => {
          const id = missingPrimary ? ++nextId : data[this.primaryId]
          return data[key].flatMap((val, idx) => [id, idx, val])
        })
      )  
    }
    return returns ? result : { success: true }
  }


  async update(id, data, idKey=null, onChangeCb=null) {
    if (id == null) throw errors.noID()
    return this.batchUpdate({ [idKey || this.primaryId]: id }, data, false, onChangeCb)
  }

  async batchUpdate(matching, updates, partialMatch=false, onChangeCb=null) {
    matching = await runAdapters(adapterKey.set, matching, this)
    matching = sanitizeSchemaData(matching, this)
    if (!Object.keys(matching).length) throw errors.noID()

    updates = await runAdapters(adapterKey.set, updates, this)
    updates = sanitizeSchemaData(updates, this)
    if (!Object.keys(updates).length) throw errors.noData()

    const current = await this.find(matching, partialMatch, null, true)
    const ids = current.map((entry) => entry[this.primaryId]).filter((id) => id != null)
    if (!ids.length) throw errors.noEntry(JSON.stringify(matching))

    if (onChangeCb) {
      const updated = await onChangeCb(updates, current)
      if (updated) updates = updated
      updates = sanitizeSchemaData(updates, this)
    }

    const arrayKeys = Object.keys(this.arrays).filter((key) => key in updates)
    const tableKeys = Object.keys(updates).filter((key) => !arrayKeys.includes(key))
    if (!tableKeys.length && !arrayKeys.length) throw errors.noData('update data after onChangeCallback')

    // DB Updates
    
    if (tableKeys.length) await services.run(getDb(),
      `UPDATE ${this.title} SET ${tableKeys.map(k => `${k} = ?`).join(', ')}
      WHERE ${Object.keys(matching).map((k) => `${k} = ?`).join(' AND ')}`,
      [...tableKeys.map((k) => updates[k]), ...Object.values(matching)]
    )

    for (const arrKey of arrayKeys) {
      // Array Updates

      if (updates[arrKey] && !Array.isArray(updates[arrKey])) throw errors.badData(arrKey, updates[arrKey], 'array')
      const table = getArrayName(this.title, arrKey)

      await services.run(getDb(),
        `DELETE FROM ${table} WHERE ${arrayLabel.foreignId} IN (${ids.map(() => '?').join(',')})`, ids
      )

      if (!updates[arrKey] || !updates[arrKey].length) continue

      await services.run(getDb(),
        `INSERT INTO ${table}(${entryKeys.join(',')}) VALUES ${
          ids.flatMap(() => updates[arrKey].map(() => `(${entryKeys.map(() => '?').join(',')})`)).join(', ')
        }`,
        ids.flatMap((id) => {
          if (updates[this.primaryId]) id = updates[this.primaryId]
          return updates[arrKey].flatMap((val, idx) => [id, idx, val])
        })
      )
    }
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
    return Promise.all(result.map((data) => runAdapters(adapterKey.get, data, this)))
  }
  
  
  async getPaginationData(
    { page, size },
    { defaultSize = 5, sizeList = [], startPage = 1 } = {}
  ) {
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
  get isArrayTable() { return this._isArrayTable }
  get hidden() { return this._hidden }
  get defaults() { return this._defaults }
  get arrays() { return this._arrays }
  get schema() { return this._schema }
  get url() { return this.isArrayTable ? getArrayPath(this.title) : this.title }
  set schema(newSchema) {
    this._arrays = extractArrays(checkInjection(newSchema, this.title), newSchema[this.primaryId])
    this._schema = newSchema
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
 *   - This will create a seperate sub-table for this entry unless "db" property is present
 *   - default: parsed from typeStr
 * @property {boolean} [hasSpaces] - If a string column will allow spaces & special characters
 *   - default: parsed from typeStr
 * @property {boolean} [isHTML] - If the data in a string column represents HTML code
 *   - default: false
 */