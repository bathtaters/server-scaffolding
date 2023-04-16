import type { Feedback, ForeignKeyRef, ArrayDefinition, SchemaBase, DefinitionSchema, ArrayDefinitions, Defaults, SQLOptions, Page, SQLSchema } from '../types/Model.d'
import { ifExistsBehaviors, type IfExistsBehavior } from '../types/db.d'
import { openDb, getDb } from '../libs/db'
import { all, get, run, reset, getLastEntry, multiRun } from '../services/db.services'
import { getPrimaryIdAndAdaptSchema, runAdapters, extractArrays } from '../services/model.services'
import { checkInjection, appendAndSort, insertSQL, selectSQL, countSQL, updateSQL, deleteSQL, swapSQL } from '../utils/db.utils'
import { caseInsensitiveObject, filterByField, isIn } from '../utils/common.utils'
import { sanitizeSchemaData, arrayTableRefs, isDbKey, getSqlParams, arraySQL, splitKeys } from '../utils/model.utils'
import { arrayLabel, adapterTypes } from '../types/Model.d'
import { getArrayName, getArrayPath } from '../config/models.cfg'
import { noID, noData, noEntry, noPrimary, noSize, badKey, multiAction } from '../config/errors.engine'

// TODO -- Make 'PrimaryID' a settable generic type to use as defaults
// TODO -- Use 'default' and 'isOptional' to generate InputSchema, DBSchema & OutputSchema types w/ correct optionals
// TODO -- Get Rid of caseInsensitiveObject and use "" with all SQL column names
// TODO -- Add documentation via JSDOC
// TODO -- Add 'increment'/'decrement' options to update()

export default class Model<Schema extends SchemaBase, DBSchema extends SchemaBase = Schema> {
  private _title: string = 'model'
  private _primaryId: keyof (DBSchema | Schema) & string = 'id'
  private _schema!: DefinitionSchema<Schema, DBSchema>
  private _defaults: Defaults<Schema, DBSchema> = {}
  private _hidden: Array<keyof DBSchema> = []
  protected _arrays: ArrayDefinitions<Schema & DBSchema> = {}
  private _isArrayTable: boolean = false
  readonly isInitialized: Promise<boolean>
  private _tmpID = -0xFF // Temporary ID to use for swaps

  constructor(title: string, definitions: DefinitionSchema<Schema, DBSchema>, isArrayTable: boolean = false) {
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
  
  /** Create and return a Model instance for an underlying/related Array table */
  getArrayTable(arrayKey: keyof Schema | keyof DBSchema) {
    const schema = this.arrays[arrayKey]
    if (!schema) return undefined
    return new Model<ArrayDefinition>(getArrayName(this.title, arrayKey), schema, true)
  }


  async getPage(page: number, size: number, reverseSort?: boolean, orderKey?: keyof DBSchema): Promise<Schema[]> {
    if (size < 1 || page < 1) return Promise.reject(noSize())
    if (typeof orderKey !== 'string' || (orderKey && !isIn(orderKey, this.schema))) throw badKey(orderKey, this.title)
    
    const result = await all(getDb(), ...selectSQL(
      this.title,
      this.primaryId,
      [],
      Object.keys(this.arrays),
      orderKey,
      reverseSort,
      size,
      page - 1
    )).then((res) => res.map(caseInsensitiveObject) as DBSchema[])

    return Promise.all(result.map((data) => runAdapters(adapterTypes.get, data, this)))
  }
  
  async getPageData(location: Page.Location, { defaultSize = 5, sizeList = [], startPage = 1 }: Page.Options = {}): Promise<Page.Data<Schema>> {
    const total = await this.count()
    const size = location.size || defaultSize
    const pageCount = Math.ceil(total / size)
    const page = Math.max(1, Math.min(location.page || startPage, pageCount))
    const sizes = pageCount > 1 || total > Math.min(...sizeList) ? appendAndSort(sizeList, size) : undefined
    
    const data = await this.getPage(page, size)
  
    return { data, page, pageCount, size, sizes }
  }



  // Base API //

  async create(overwrite?: boolean): Promise<Feedback> {
    
    let dbSchema: SQLSchema = { [this.title]: filterByField(this.schema, 'db') },
      indexes: Record<string, string[]     > = {},
      refs:    Record<string, ForeignKeyRef> = {}
    
    if (!this.isArrayTable) Object.entries(this.arrays).forEach(([arrayKey,definition]) => {
      if (!definition) return;

      const table = getArrayName(this.title, arrayKey)

      dbSchema[table] = filterByField<any>(definition, 'db')
      indexes[table]  = [arrayLabel.foreignId, arrayLabel.index]
      refs[table]     = arrayTableRefs(this)
    })
    
    await reset(getDb(), dbSchema, overwrite, indexes, refs)
    return { success: true }
  }


  async count<ID extends keyof (Schema | DBSchema) & string>(id?: Schema[ID], idKey?: ID): Promise<number> {
    if (!isDbKey(idKey, this.schema)) throw badKey(idKey, this.title)
    
    const result = await get<{ count: number }>(getDb(), ...countSQL(
      this.title,
      id == null ? [] : [[`${idKey || this.primaryId} = ?`, id]]
    ))
    return result.count
  }

  get<ID extends keyof (Schema | DBSchema) & string>(
    id: Schema[ID], { idKey, ...options }: { idKey?: ID } & SQLOptions<DBSchema> = {}
  ): Promise<Schema | undefined> {
    return this.find({ [idKey || this.primaryId]: id } as any, options).then((data) => data[0])
  }

  findRaw(where?: Partial<Schema>, options: SQLOptions<DBSchema> = {}): Promise<DBSchema[]> {
    return this._select(where, options, true)
  }

  async find(where?: Partial<Schema>, options: SQLOptions<DBSchema> = {}): Promise<Schema[]> {
    const result = await this.findRaw(where, options)
    return Promise.all(result.map((data) => runAdapters(adapterTypes.get, data, this)))
  }

  findBaseRaw(where?: Partial<Schema>, options: SQLOptions<DBSchema> = {}): Promise<Partial<DBSchema>[]> {
    return this._select(where, options, false)
  }

  async findBase(where?: Partial<Schema>, options: SQLOptions<DBSchema> = {}): Promise<Partial<Schema>[]> {
    const result = await this.findRaw(where, options)
    return Promise.all(result.map((data) => runAdapters(adapterTypes.get, data, this)))
  }
  
  
  add(data: Schema[], ifExists: IfExistsBehavior = 'default'): Promise<Feedback> {
    return this._insert(data, ifExists, false).then(() => ({ success: true }))
  }

  addAndReturn(data: Schema[], ifExists: IfExistsBehavior = 'default'): Promise<DBSchema> {
    return this._insert(data, ifExists, true)
  }


  /** Checks if ID exists before updating */
  async update<ID extends keyof (Schema | DBSchema) & string>(
    id: Schema[ID], data: Partial<Schema>, { idKey, ...options }: { idKey?: ID } & SQLOptions<DBSchema> = {}
  ) {
    if (id == null) throw noID()

    const count = await this.count(id, idKey)
    if (!count) throw noEntry(id)
    if (count !== 1) throw multiAction('Updating',count)

    return this.batchUpdate({ [idKey || this.primaryId]: id } as any, data, options)
  }

  /** Doesn't check if IDs exist before updating */
  async batchUpdate(where: Partial<Schema>, data: Partial<Schema>, options: SQLOptions<DBSchema> = {}): Promise<Feedback> {
    return this._update(data, where, options).then((success) => ({ success }))
  }
  

  /** Checks if ID exists before removing */
  async remove<K extends keyof DBSchema & string>(id: DBSchema[K], idKey?: K): Promise<Feedback> {
    if (id == null) throw noID()

    const count = await this.count(id, idKey)
    if (!count) throw noEntry(id)
    if (count !== 1) throw multiAction('Deleting',count)

    return this.batchRemove([id], idKey)
  }

  /** Doesn't check if IDs exist before removing */
  async batchRemove<K extends keyof DBSchema & string>(ids: DBSchema[K][], idKey?: K): Promise<Feedback> {
    return this._delete(ids, idKey).then((success) => ({ success }))
  }

  /** Checks if 1st ID exists before swapping, if missing 2nd ID just rename 1st ID */
  async swap<K extends keyof DBSchema & string>(idA: DBSchema[K], idB: DBSchema[K], idKey?: K): Promise<Feedback> {
    if (idA == null || idA == null) throw noID()

    const count = await this.count(idA)
    if (!count) throw noEntry(idA)

    return this._swap(idA, idB, idKey).then((success) => ({ success }))
  }


  /** Use to call Custom SQL, and run result though adapter (if raw != true).
   *  - Check sqlite3 API documentation for all() to understand sql/params
   *  - WARNING! RETURN TYPE SHOULD BE CAST MANUALLY FROM any[]
   *  - WARNING! sql IS NOT CHECKED FOR INJECTION, DON'T PASS UNSANITIZED UI */
  async custom(sql: string, params?: { [key: string]: any } | any[], raw?: boolean): Promise<any[]> {
    const result = await all(getDb(), sql, params)
      .then((res) => res.map(caseInsensitiveObject))
    if (raw) return result
    return Promise.all(result.map((data) => runAdapters(adapterTypes.get, data, this)))
  }



  // Base SQL //

  private async _selectRaw(where: Partial<DBSchema> | undefined, options: SQLOptions<DBSchema>, includeArrays: true): Promise<DBSchema[]>;
  private async _selectRaw(where: Partial<DBSchema> | undefined, options: SQLOptions<DBSchema>, includeArrays: boolean): Promise<Partial<DBSchema>[]>;
  private async _selectRaw(where: Partial<DBSchema> | undefined, { partialMatch, orderKey }: SQLOptions<DBSchema>, includeArrays: boolean): Promise<Partial<DBSchema>[]> {

    const params = getSqlParams(this, where, partialMatch)
    
    const result = await all(getDb(), ...selectSQL(
      this.title, this.primaryId, params,
      includeArrays ? Object.keys(this.arrays) : [],
      orderKey
    ))

    return result.map(caseInsensitiveObject)
  }

  private async _select(where: Partial<Schema> | undefined, options: SQLOptions<DBSchema>, includeArrays: true): Promise<DBSchema[]>;
  private async _select(where: Partial<Schema> | undefined, options: SQLOptions<DBSchema>, includeArrays: boolean): Promise<Partial<DBSchema>[]>;
  private async _select(where: Partial<Schema> | undefined, options: SQLOptions<DBSchema>, includeArrays: boolean): Promise<Partial<DBSchema>[]> {
    
    let whereData: Partial<DBSchema> | undefined

    if (where)
      whereData = await runAdapters(adapterTypes.set, where, this)
        .then((entry) => sanitizeSchemaData(entry, this) as Partial<DBSchema>)

    return this._selectRaw(whereData, options, includeArrays)
  }


  private async _insert(data: Schema[], ifExists: IfExistsBehavior, returnLast: false): Promise<false>;
  private async _insert(data: Schema[], ifExists: IfExistsBehavior, returnLast:  true): Promise<DBSchema>;
  private async _insert(data: Schema[], ifExists: IfExistsBehavior, returnLast: boolean): Promise<DBSchema|false>;
  private async _insert(data: Schema[], ifExists: IfExistsBehavior, returnLast: boolean): Promise<DBSchema|false> {
    if (!data.length) throw noData('batch data')

    // Adapt/Sanitize data
    const dataArray = await Promise.all(data.map(
      (entry) => runAdapters(adapterTypes.set, { ...this.defaults, ...entry }, this)
    ))
    
    const keys = splitKeys(dataArray[0], this.arrays)
    if (!keys.base.length && !keys.array.length) throw noData()
    
    const params = insertSQL(this.title, dataArray, keys.base, ifExists)
    const missingPrimary = !keys.base.includes(this.primaryId)

    // Update DB

    const lastEntry = await (returnLast || missingPrimary ? getLastEntry(getDb(), ...params, this.title) : run(getDb(), ...params))
    if (!keys.array.length) return returnLast && lastEntry
    
    // Get rowId if primaryId wasn't provided
    if (missingPrimary && typeof lastEntry[this.primaryId] !== 'number') throw noPrimary(this.title,'add')
    const primaryKey = !missingPrimary ? this.primaryId : lastEntry[this.primaryId] - dataArray.length
    
    await run(getDb(), ...arraySQL(this.title, dataArray, keys.array, primaryKey, ifExists))
    return returnLast && lastEntry
  }


  private async _update(data: Partial<Schema>, where: Partial<Schema>, { partialMatch, onChange }: SQLOptions<DBSchema>): Promise<boolean> {
    
    // Adapt/Sanitize data
    const whereData = await runAdapters(adapterTypes.set, where, this)
    if (!Object.keys(whereData).length) throw noID()

    let updateData = await runAdapters(adapterTypes.set, data, this)
    if (!Object.keys(updateData).length) throw noData()

    // Find matching entries
    let ids = [whereData[this.primaryId]] // simple method

    if (ids[0] == null || onChange) { // complex method

      const currentData = await this._selectRaw(whereData, { partialMatch }, !!onChange)

      ids = currentData.map((entry) => entry[this.primaryId]).filter((id) => id != null)
      if (!ids.length) throw noEntry(JSON.stringify(whereData))

      if (onChange) {
        // Run onChange callback here to avoid re-fetching 'currentData'
        const changed = await onChange(updateData, currentData as DBSchema[])
        if (changed) updateData = changed
        updateData = sanitizeSchemaData(updateData, this) as Partial<DBSchema>
      }
    }
    
    // Update DB
    const keys = splitKeys(updateData, this.arrays)
    if (!keys.base.length && !keys.array.length) throw noData('update data after onChangeCallback')

    if (keys.base.length) await run(getDb(), ...updateSQL(this.title, updateData, keys.base, whereData))

    if (keys.array.length) await run(getDb(), ...arraySQL(
      this.title,
      [updateData],
      keys.array,
      this.primaryId,
      ifExistsBehaviors.abort,
      true,
    ))

    return true
  }


  private async _delete<K extends keyof DBSchema & string>(ids: DBSchema[K][], idKey?: K): Promise<boolean> {
    if (ids.length) throw noID()
    await run(getDb(), ...deleteSQL(this.title, idKey || this.primaryId, ids))
    return true
  }


  private async _swap<K extends keyof DBSchema & string>(idA: DBSchema[K], idB: DBSchema[K], idKey?: K): Promise<boolean> {
    if (!idA || !idB) throw noID()

    await multiRun(getDb(), swapSQL(this.title, idKey || this.primaryId, idA, idB, this._tmpID))
    return true
  }
  

  // Private getters
  get title() { return this._title }
  get primaryId() { return this._primaryId }
  get isArrayTable() { return this._isArrayTable }
  get hidden() { return this._hidden }
  get defaults() { return this._defaults }
  get arrays() { return this._arrays }
  get schema() { return this._schema }
  get url() { return this.isArrayTable ? getArrayPath(this.title) : this.title }
  
  // Check for injection on set
  set title(newTitle) { this._title = checkInjection(newTitle) }
  set primaryId(newId) { this._primaryId = checkInjection(newId, this.title) }
  set schema(newSchema) {
    this._arrays = extractArrays(checkInjection(newSchema, this.title), newSchema[this.primaryId])
    this._schema = newSchema
    this._defaults = filterByField(newSchema, 'default')
    this._hidden = Object.keys(newSchema).filter((key) => newSchema[key].dbOnly)
  }
}

export type ModelBase<Schema extends SchemaBase = any, DBSchema extends SchemaBase = Schema> = InstanceType<typeof Model<Schema, DBSchema>>