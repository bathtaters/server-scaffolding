// @ts-nocheck // Until entire engine is converted to TypeScript
import { Definition, Feedback, ChangeCallback, IfExistsBehavior, ForeignKeyRef } from './Model.d'
import { openDb, getDb } from '../libs/db'
import services from '../services/db.services'
import { getPrimaryIdAndAdaptSchema, runAdapters, extractArrays } from '../services/model.services'
import { checkInjection, appendAndSort, getArrayJoin } from '../utils/db.utils'
import { caseInsensitiveObject, filterByField } from '../utils/common.utils'
import { isBool, sanitizeSchemaData, arrayTableRefs } from '../utils/model.utils'
import { parseBoolean } from '../utils/validate.utils'
import { adapterKey, ifExistsBehavior, CONCAT_DELIM, arrayLabel, getArrayName, getArrayPath } from '../config/models.cfg'
import errors from '../config/errors.engine'

const parseBool = parseBoolean(true)
const entryKeys = [arrayLabel.foreignId, arrayLabel.index, arrayLabel.entry]

export default class Model<Schema extends object> {
  private _title: string = 'model'
  private _primaryId: keyof Schema = 'id'
  private _schema: { [key: string]: Definition } = {}
  private _defaults: Partial<Schema> = {}
  private _hidden: Array<keyof Schema> = []
  protected _arrays: { [key: string]: Definition } = {}
  private _isArrayTable: boolean = false
  readonly isInitialized: Promise<boolean>

  constructor(title: string, definitions: { [key: string]: Definition }, isArrayTable: boolean = false) {
    this._isArrayTable = isArrayTable
    if (this.isArrayTable) this._title = title
    else this.title = title

    this.primaryId = getPrimaryIdAndAdaptSchema(definitions, this.title)
    this.schema = definitions

    this.isInitialized = (async () => {
      if (!getDb()) { await openDb() }
      return this.create().then((r) => r.success)
    })()
  }
  

  async create(overwrite?: boolean): Promise<Feedback> {
    let dbSchema = { [this.title]: filterByField(this.schema, 'db') },
    indexes: { [key: string]: string[] } = {},
    refs: ForeignKeyRef = {}
    
    if (!this.isArrayTable) Object.keys(this.arrays).forEach((key) => {
      const table = getArrayName(this.title, key)
      dbSchema[table] = filterByField(this.arrays[key], 'db')
      indexes[table]  = [arrayLabel.foreignId, arrayLabel.index]
      refs[table] = arrayTableRefs(this)
    })
    
    await services.reset(getDb(), dbSchema, overwrite, indexes, refs)
    return { success: true }
  }

  getArrayTable(arrayKey: keyof Schema) {
    return new Model(getArrayName(this.title, arrayKey), this.arrays[arrayKey], true)
  }

  get(): Promise<Schema[]>
  get(id: Schema[keyof Schema], idKey?: string, raw?: boolean): Promise<Schema>
  get(id: Schema[keyof Schema], idKey?: string, raw?: boolean, skipArrays?: boolean): Promise<Partial<Schema>>
  async get(id?: Schema[keyof Schema], idKey?: string, raw?: boolean, skipArrays?: boolean): Promise<Schema|Schema[]|Partial<Schema>> {
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


  async getPage(page: number, size: number, reverse?: boolean, orderKey?: string): Promise<Schema[]> {
    if (!size) return Promise.reject(errors.noSize())
    if (orderKey && !Object.keys(this.schema).includes(orderKey)) throw errors.badKey(orderKey, this.title)

    const sql = `${getArrayJoin(this, Object.keys(this.arrays))} ${
      reverse == null && !orderKey ? '' : `ORDER BY ${this.title}.${orderKey || this.primaryId} ${reverse ? 'DESC' : 'ASC'} `
    }LIMIT ? OFFSET ?`
    
    const result = await services.all(getDb(), sql, [size, (page - 1) * size])
      .then((res) => res.map(caseInsensitiveObject))

    return Promise.all(result.map((data: Schema) => runAdapters(adapterKey.get, data, this)))
  }


  async find(matchData: Partial<Schema>, partialMatch?: boolean, orderKey?: keyof Schema, raw: boolean = false): Promise<Schema[]> {
    matchData = await runAdapters(adapterKey.set, matchData, this)
    matchData = sanitizeSchemaData(matchData, this)

    const searchData: [string, Schema[keyof Schema]][] = Object.entries(matchData)
    searchData.forEach(([key]) => {
      if (key in this.arrays) throw new Error(`Array search not implemented: ${key} in query.`)
    })
    if (!searchData.length) throw errors.noData()

    let text: string[] = [], params: any[] = []
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
    params).then((res: Schema[]) => res.map(caseInsensitiveObject))

    return raw ? result : Promise.all(result.map((data: Schema) => runAdapters(adapterKey.get, data, this)))
  }


  async count(id?: Schema[keyof Schema], idKey?: string): Promise<number> {
    if (idKey && !Object.keys(this.schema).includes(idKey)) throw errors.badKey(idKey, this.title)
    
    const filter = id != null ? ` WHERE ${idKey || this.primaryId} = ?` : ''
    const result = await services.get(getDb(),
      `SELECT COUNT(*) c FROM ${this.title}${filter}`,
      id != null ? [id] : []
    )
    return result && result.c
  }
  
  
  add(data: Schema, ifExists: IfExistsBehavior = 'default'): Promise<Schema> { return this.batchAdd([data], ifExists, true) }
  batchAdd(dataArray: Schema[], ifExists?: IfExistsBehavior): Promise<Feedback>
  batchAdd(dataArray: Schema[], ifExists: IfExistsBehavior, returns: boolean): Promise<Schema|Feedback>
  async batchAdd(dataArray: Schema[], ifExists: IfExistsBehavior = 'default', returns?: boolean): Promise<Schema|Feedback> {
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
    
    let nextId: number | undefined
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


  async update(id: Schema[keyof Schema], data: Partial<Schema>, idKey?: string, onChangeCb?: ChangeCallback<Schema>): Promise<Feedback> {
    if (id == null) throw errors.noID()
    return this.batchUpdate({ [idKey || this.primaryId]: id }, data, false, onChangeCb)
  }

  async batchUpdate(matching: Partial<Schema>, updates: Partial<Schema>, partialMatch: boolean = false, onChangeCb?: ChangeCallback<Schema>): Promise<Feedback> {
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
    
    await services.run(getDb(),
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
  
  
  async remove(id: Schema[keyof Schema], idKey?: string): Promise<Feedback> {
    if (id == null) return Promise.reject(errors.noID())

    const count = await this.count(id, idKey)
    if (!count) throw errors.noEntry(id)

    await services.run(getDb(),
      `DELETE FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`,
    [id])
    return { success: true }
  }


  async custom<ReturnT = any>(sql: string, params?: { [key: string|number]: any }, raw?: boolean): Promise<ReturnT[]> {
    /* WARNING!! SQL CANNOT BE CHECKED FOR INJECTION */
    const result = await services.all(getDb(), sql, params)
      .then((res) => res.map(caseInsensitiveObject))
    if (raw) return result
    return Promise.all(result.map((data) => runAdapters(adapterKey.get, data, this)))
  }
  
  
  async getPaginationData(
    { page, size }: { page?: number, size?: number },
    { defaultSize = 5, sizeList = [], startPage = 1 }:
    { defaultSize?: number, startPage?: number, sizeList?: number[] } = {}
  ): Promise<{ data: Schema[], page: number, pageCount: number, size: number, sizes: number[] }> {
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
