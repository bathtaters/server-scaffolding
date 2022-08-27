// @ts-nocheck // Until entire engine is converted to TypeScript
import { Definition, Feedback, ChangeCallback, IfExistsBehavior } from './Model.d'
import { openDb, getDb } from '../libs/db'
import services from '../services/db.services'
import { getPrimaryIdAndAdaptSchema, runAdapters } from '../services/model.services'
import { checkInjection, appendAndSort } from '../utils/db.utils'
import { caseInsensitiveObject, filterByField } from '../utils/common.utils'
import { isBool, sanitizeSchemaData } from '../utils/model.utils'
import { parseBoolean } from '../utils/validate.utils'
import { adapterKey, ifExistsBehavior } from '../config/models.cfg'
import errors from '../config/errors.engine'

const parseBool = parseBoolean(true)
export default class Model<Schema extends object> {
  private _title: string = 'model'
  private _primaryId: string = 'id'
  private _schema: { [key: string]: Definition } = {}
  private _defaults: Partial<Schema> = {}
  private _hidden: string[] = []
  readonly isInitialized: Promise<boolean>

  constructor(title: string, definitions: { [key: string]: Definition }) {
    if (!definitions) throw new Error(`${title} must be provided a definitions object.`)

    this.title = title
    this.primaryId = getPrimaryIdAndAdaptSchema(definitions, this.title)
    this.schema = definitions

    this.isInitialized = new Promise(async (res, rej) => {
      if (!getDb()) { await openDb() }
      this.create().then((r) => r.success ? res(true) : rej(r)).catch(rej)
    })
  }
  

  create(overwrite?: boolean): Promise<Feedback> {
    const dbSchema = { [this.title]: filterByField(this.schema, 'db') }
    return services.reset(getDb(), dbSchema, overwrite).then(() => ({ success: true }))
  }


  get(): Promise<Schema[]>
  get(id: Schema[keyof Schema], idKey?: string, raw?: boolean): Promise<Schema>
  async get(id?: Schema[keyof Schema], idKey?: string, raw?: boolean): Promise<Schema|Schema[]> {
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


  async getPage(page: number, size: number, reverse?: boolean, orderKey?: string): Promise<Schema[]> {
    if (!size) return Promise.reject(errors.noSize())
    if (orderKey && !Object.keys(this.schema).includes(orderKey)) throw errors.badKey(orderKey, this.title)

    const sort = reverse == null && !orderKey ? '' : `ORDER BY ${orderKey || this.primaryId} ${reverse ? 'DESC' : 'ASC'} `

    const result = await services.all(getDb(), 
      `SELECT * FROM ${this.title} ${sort}LIMIT ? OFFSET ?`,
      [size, (page - 1) * size]
    ).then((res: Schema[]) => res.map(caseInsensitiveObject))

    return Promise.all(result.map((data: Schema) => runAdapters(adapterKey.get, data, this.schema, this.hidden)))
  }


  async find(matchData: Partial<Schema>, partialMatch?: boolean): Promise<Schema[]> {
    matchData = await runAdapters(adapterKey.set, matchData, this.schema)
    matchData = sanitizeSchemaData(matchData, this.schema)

    const searchData: [string, Schema[keyof Schema]][] = Object.entries(matchData)
    if (!searchData.length) throw errors.noData()

    let text: string[] = [], params: any[] = []
    searchData.forEach(([key,val]) => {
      if (!partialMatch) {
        text.push(`${key} = ?`)
        return params.push(val)
        
      } if (this.schema[key].isBitmap) {
        const num = +val
        text.push(`${key} ${num ? '&' : '='} ?`)
        return params.push(num)

      } if (isBool(this.schema[key])) {
        text.push(`${key} = ?`)
        return params.push(+parseBool(val))

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
    params).then((res: Schema[]) => res.map(caseInsensitiveObject))

    return Promise.all(result.map((data: Schema) => runAdapters(adapterKey.get, data, this.schema, this.hidden)))
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
  
  
  add(data: Schema, ifExists: IfExistsBehavior = 'default'): Promise<Schema> {
    return this.batchAdd([data], ifExists, true) as Promise<Schema>
  }


  batchAdd(dataArray: Schema[], ifExists?: IfExistsBehavior): Promise<Feedback>
  batchAdd(dataArray: Schema[], ifExists: IfExistsBehavior, returns: boolean): Promise<Schema|Feedback>
  async batchAdd(dataArray: Schema[], ifExists: IfExistsBehavior = 'default', returns?: boolean): Promise<Schema|Feedback> {
    dataArray = await Promise.all(dataArray.map((data) => runAdapters(adapterKey.set, { ...this.defaults, ...data }, this.schema)))
    dataArray = dataArray.map((data) => sanitizeSchemaData(data, this.schema))
    
    const keys = Object.keys(dataArray[0]) as Array<keyof Schema>
    if (!keys.length) throw errors.noData()

    return services[returns ? 'getLastEntry' : 'run'](getDb(),
      `INSERT${ifExists ? ifExistsBehavior[ifExists] : ifExistsBehavior.default} INTO ${this.title}(${
        keys.join(',')
      }) VALUES ${
        dataArray.map(() => `(${keys.map(() => '?').join(',')})`).join(',')
      }`,
      dataArray.flatMap((data) => keys.map((key) => data[key])),
      returns && this.title,
    ).then((ret: Schema|void) => returns ? ret : { success: true })
  }
  
  
  async update(id: Schema[keyof Schema], data: Partial<Schema>, idKey?: string, onChangeCb?: ChangeCallback<Schema>): Promise<Feedback> {
    if (id == null) throw errors.noID()

    data = await runAdapters(adapterKey.set, data, this.schema)
    data = sanitizeSchemaData(data, this.schema)
    if (!Object.keys(data).length) throw errors.noData()

    const current = await this[onChangeCb ? 'get' : 'count'](id, idKey, true)
    if (!current) throw errors.noEntry(id)

    if (onChangeCb) {
      const updated = await onChangeCb(data, current as Awaited<Schema>)
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
  
  
  async remove(id: Schema[keyof Schema], idKey?: string): Promise<Feedback> {
    if (id == null) return Promise.reject(errors.noID())

    const count = await this.count(id, idKey)
    if (!count) throw errors.noEntry(id)

    await services.run(getDb(),
      `DELETE FROM ${this.title} WHERE ${idKey || this.primaryId} = ?`,
    [id])
    return { success: true }
  }


  async custom(sql: string, params?: any[], raw?: boolean): Promise<Partial<Schema>[]> {
    /* WARNING!! SQL CANNOT BE CHECKED FOR INJECTION */
    const result = await services.all(getDb(), sql, params)
      .then((res: Schema[]) => res.map(caseInsensitiveObject))
    if (raw) return result
    return Promise.all(result.map((data: Schema) => runAdapters(adapterKey.get, data, this.schema, this.hidden)))
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
  get hidden() { return this._hidden }
  get defaults() { return this._defaults }
  get schema() { return this._schema }
  set schema(newSchema) {
    this._schema = checkInjection(newSchema, this.title)
    this._defaults = filterByField(newSchema, 'default')
    this._hidden = Object.keys(newSchema).filter((key) => newSchema[key].dbOnly)
  }
}
