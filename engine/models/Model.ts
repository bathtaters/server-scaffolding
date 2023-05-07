import type {
  Feedback, ForeignKeyRef, ArrayDefinition, ArrayDefinitions, SchemaBase, DefinitionSchema,
  Defaults, SQLOptions, Page, SQLSchema, FindResult, SelectResult
} from '../types/Model.d'
import type { IfExistsBehavior, UpdateData, WhereData } from '../types/db.d'
import logger from '../libs/log'
import { childLabel, adapterTypes } from '../types/Model'
import { ifExistsBehaviors } from '../types/db'
import { openDb, getDb } from '../libs/db'
import { all, get, run, reset, getLastEntry, multiRun } from '../services/db.services'
import { getPrimaryIdAndAdaptSchema, runAdapters, extractChildren } from '../services/model.services'
import { checkInjection, appendAndSort, insertSQL, selectSQL, countSQL, updateSQL, deleteSQL, swapSQL } from '../utils/db.utils'
import { caseInsensitiveObject, mapToField, isIn } from '../utils/common.utils'
import { sanitizeSchemaData, childTableRefs, getSqlParams, childSQL, splitKeys } from '../utils/model.utils'
import { getChildName, getChildPath } from '../config/models.cfg'
import { noID, noData, noEntry, noPrimary, noSize, badKey, multiAction, updatePrimary } from '../config/errors.engine'

// TODO -- Use 'default' and 'isOptional' to generate InputSchema, DBSchema & OutputSchema types w/ correct optionals
// TODO -- Test Arrays!! (These were not tested since migrating to TypeScript)

/** Base Model Class, each instance represents a separate model */
export default class Model<Schema extends SchemaBase, DBSchema extends SchemaBase = Schema> {
  private _title: string = 'model'
  private _primaryId: keyof (DBSchema | Schema) & string = 'id'
  private _schema!: DefinitionSchema<Schema, DBSchema>
  private _defaults: Defaults<Schema, DBSchema> = {}
  private _hidden: Array<keyof DBSchema> = []
  protected _children: ArrayDefinitions<Schema & DBSchema> = {}
  private _isChildModel: boolean = false

  /** Promise that will resolve to TRUE once DB is connected and Model is created */
  readonly isInitialized: Promise<boolean>
  /** Temporary ID to use for swaps */
  private _tmpID = -0xFF

  /** Create a DB connection to the given model
   * @param title - Model Name (Name used to represent it in the DB)
   * @param definitions - Schema of model, each column is a key (See Type for additional documentation)
   * @param isChildModel - (Optional) Indicates that this model is a sub-model of a main model
   *  (These should mainly be automatically created for Array & Object definitions)
   */
  constructor(title: string, definitions: DefinitionSchema<Schema, DBSchema>, isChildModel: boolean = false) {
    this._isChildModel = isChildModel
    if (this.isChildModel) this._title = title
    else this.title = title

    this.primaryId = getPrimaryIdAndAdaptSchema(definitions, this.title, this.isChildModel)
    this.schema = definitions

    this.isInitialized = (async () => {
      if (!getDb()) { await openDb() }
      const { success } = await this.create()
      return success
    })()
  }
  
  /** Create and return a Model instance for a child model
   * @param childName - Name of child model in schema
   * @returns Model instance of the child
   */
  getChildModel(childName: keyof Schema | keyof DBSchema) {
    const schema = this.children[childName]
    if (!schema) return undefined
    return new Model<ArrayDefinition>(getChildName(this.title, childName), schema, true)
  }


  /** Get paginated data
   * @param page - Page number (1-indexed)
   * @param size - Page size (Must be at least 1)
   * @param reverseSort - (Optional) If true, order data descending
   * @param orderKey - (Optional) Column to order data by
   * @returns Page of data as an array
   */
  async getPage(page: number, size: number, reverseSort?: boolean, orderKey?: keyof DBSchema): Promise<Schema[]> {
    if (size < 1 || page < 1) return Promise.reject(noSize())
    if (orderKey != null && (typeof orderKey !== 'string' || (orderKey && !isIn(orderKey, this.schema))))
      throw badKey(orderKey, this.title)
    
    let result = await all<DBSchema>(getDb(), ...selectSQL(
      this.title,
      this.primaryId,
      [],
      Object.keys(this.children),
      orderKey,
      reverseSort,
      size,
      page - 1
    ))
    result = result.map(caseInsensitiveObject)

    return Promise.all(result.map((data) => runAdapters(adapterTypes.get, data, this)))
  }
  
  /**
   * Get paginated data, with pagination metadata
   * @param location - Parameters on which data to fetch
   * @param location.page - Page number (1-indexed)
   * @param location.size - Page size
   * @param pageOptions - Optional options for data
   * @param pageOptions.defaultSize - Page size to use if not provided in location
   * @param pageOptions.startPage - Page number to use if not provided in location
   * @param pageOptions.sizeList - Available page sizes
   * @returns Object of:
   *    - data: Page data as array
   *    - page: Current page number
   *    - pageCount: Last page number
   *    - size: Current page size
   *    - sizes: Available page sizes
   */
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

  /** Create and/or connect to model in database
   * @param overwrite - If true, erase the table
   * @returns Object: { success: true/false }
   */
  async create(overwrite?: boolean): Promise<Feedback> {
    
    let dbSchema: SQLSchema = { [this.title]: mapToField(this.schema, 'db') },
      indexes: Record<string, string[]     > = {},
      refs:    Record<string, ForeignKeyRef> = {}
    
    if (!this.isChildModel) Object.entries(this.children).forEach(([arrayKey,definition]) => {
      if (!definition) return;

      const table = getChildName(this.title, arrayKey)

      dbSchema[table] = mapToField<any>(definition, 'db')
      indexes[table]  = [childLabel.foreignId, childLabel.index]
      refs[table]     = childTableRefs(this)
    })
    
    await reset(getDb(), dbSchema, overwrite, indexes, refs)
    return { success: true }
  }

  /** Count the number of records of this model
   * @param where - (Optional) Key/Value pairs to count matches of
   *    - Can also use { key: whereLogic OR { whereOp: value } } instead of { key: value }
   *    - WhereLogic is { $and/$or: [ ...WhereData ] } OR { $not: WhereData }
   *    - WhereOps are: $gt(e), $lt(e), $eq, $in (Partial match)
   * @returns Count of matching records (or all records if 'where' is omitted)
   */
  async count(where?: WhereData<Schema>): Promise<number> {
    const whereData = where && await runAdapters(adapterTypes.set, where, this)
    return this._countRaw(whereData)
  }

  /** Get the first record that matches the given ID
   * @param id - ID value to lookup
   * @param options - (Optional) Lookup options
   * @param options.idKey - (Default: Primary ID) Key of ID to lookup
   * @param options.orderKey - Order results by this key
   * @param options.skipChildren - Avoid joins, returned value will not include children
   * @param options.raw - Skip getAdapters, return raw DB values
   * @returns First record matching ID, or undefined if no match
   */
  async get<ID extends Model<Schema,DBSchema>['primaryId'], O extends SQLOptions<DBSchema>>
  (id: Schema[ID], { idKey, ...options }: { idKey?: ID } & O = {} as O) {
    
    const [data] = await this.find({ [idKey || this.primaryId]: id } as Schema, options)
    return data
  }

  /** Lookup and return multiple records
   * @param where - Key/Value pairs to return matches of
   *    - Can also use { [whereOp/whereLogic]: value } instead of value
   *    - WhereOps are: $gt(e), $lt(e), $eq, $in (Partial match)
   *    - WhereLogic is { $and/$or: [ ...WhereData ] }, { $not: WhereData }
   * @param options - (Optional) Lookup options
   * @param options.orderKey - Order results by this key
   * @param options.skipChildren - Avoid joins, returned value will not include children
   * @param options.raw - Skip getAdapters, return raw DB values
   * @returns Array of all records that satisfy parameters
   */
  async find<O extends SQLOptions<DBSchema>>(
    where?: WhereData<Schema>,
    options: O = {} as O
  ): FindResult<O, Schema, DBSchema> {
    
    const result = await this._select(where, options)
    return options.raw ? result as any :
      Promise.all(result.map((data) => runAdapters(adapterTypes.get, data, this)))
  }
  
  
  /** Add entrie(s) to database
   * @param data - Array of new entries as objects
   * @param ifExists - How to handle non-unique entries (Default: default)
   * @returns Object: { success: true/false }
   */
  async add(data: Schema[], ifExists: IfExistsBehavior = 'default'): Promise<Feedback> {
    const success = await this._insert(data, ifExists, false)
    return ({ success })
  }

  /** Add entrie(s) to database, returning last entry added
   * @param data - Array of new entries as objects
   * @param ifExists - How to handle non-unique entries (Default: default)
   * @returns Record of last entry (After adding to DB)
   */
  addAndReturn(data: Schema[], ifExists: IfExistsBehavior = 'default'): Promise<DBSchema> {
    return this._insert(data, ifExists, true)
  }


  /** Update given data fields in record matching ID
   * - Doesn't modify any keys not present in "data"
   * - Checks if ID exists before updating
   * @param id - ID value to lookup
   * @param data - Key/Value object to update matching record to
   * @param options - (Optional) Update options
   * @param options.idKey - (Default: Primary ID) Key of ID to lookup
   * @param options.onChange - Function (Sync/Async) called immediately before records are updated
   *  - Param: update - Keys/Values to Update (Post-adapter)
   *  - Param: matching - Array of records that will be updated (pre-adapter/no joins))
   *  - Returns: New value for "update" OR mutates update within function
   * @returns Object: { success: true/false }
   */
  async update<ID extends Model<Schema,DBSchema>['primaryId']>
  (id: Schema[ID], data: UpdateData<Schema>, { idKey, ...options }: { idKey?: ID } & SQLOptions<DBSchema> = {}) {
    if (id == null) throw noID()

    const whereData = await runAdapters(
      adapterTypes.set,
      { [idKey || this.primaryId]: id } as Partial<Schema>,
      this
    )

    const count = await this._countRaw(whereData)
    if (!count) throw noEntry(id)
    if (count !== 1) throw multiAction('Updating',count)

    const success = await this._update(data, whereData, options)
    return { success }
  }


  /** Update given data fields in record matching "where"
   * - Doesn't modify any keys not present in "data"
   * - Doesn't check if IDs exist before updating
   * @param where - Key/Value pairs to select data for updating
   *    - Can also use { [whereOp/whereLogic]: value } instead of value
   *    - WhereOps are: $gt(e), $lt(e), $eq, $in (Partial match)
   *    - WhereLogic is { $and/$or: [ ...WhereData ] }, { $not: WhereData }
   * @param data - Key/Value object to update matching record to
   * @param options - (Optional) Update options
   * @param options.onChange - Function (Sync/Async) called immediately before records are updated
   *  - Param: update - Keys/Values to Update (Post-adapter)
   *  - Param: matching - Array of records that will be updated (pre-adapter/no joins))
   *  - Returns: New value for "update" OR mutates update within function
   * @returns Object: { success: true/false }
   */
  async batchUpdate(where: WhereData<Schema>, data: UpdateData<Schema>, options: SQLOptions<DBSchema> = {}): Promise<Feedback> {
    const whereData = await runAdapters(adapterTypes.set, where, this)
    const success = await this._update(data, whereData, options)
    return { success }
  }
  

  /** Remove record(s) matching ID
   *  - Checks if ID exists before removing
   * @param id - ID value to remove
   * @param idKey - (Default: Primary ID) Key of ID to remove
   * @returns Object: { success: true/false }
   */
  async remove<ID extends Model<Schema,DBSchema>['primaryId']>(id: Schema[ID], idKey?: ID): Promise<Feedback> {
    if (id == null) throw noID()

    const whereData = await runAdapters(
      adapterTypes.set,
      { [idKey || this.primaryId]: id } as Partial<Schema>,
      this
    )

    const count = await this._countRaw(whereData)
    if (!count) throw noEntry(id)
    if (count !== 1) throw multiAction('Deleting',count)

    const success = await this._delete(whereData)
    return { success }
  }

  /** Remove record(s) matching ID
   *  - Doesn't check if IDs exist before removing
   * @param where - Key/Value pairs to remove matches of
   *    - Can also use { [whereOp/whereLogic]: value } instead of value
   *    - WhereOps are: $gt(e), $lt(e), $eq, $in (Partial match)
   *    - WhereLogic is { $and/$or: [ ...WhereData ] }, { $not: WhereData }
   * @returns Object: { success: true/false }
   */
  async batchRemove(where: WhereData<Schema>): Promise<Feedback> {
    const whereData = await runAdapters(adapterTypes.set, where, this)
    const success = await this._delete(whereData)
    return { success }
  }


  /** Swap the IDs of 2 records
   *  - Checks if 1st ID exists before swapping, if missing 2nd ID just rename 1st ID
   * @param idA - ID value to swap from
   * @param idB - ID value to swap with
   * @param idKey - (Default: Primary ID) Key of ID A & B values
   * @returns Object: { success: true/false }
   */
  async swap<ID extends Model<Schema,DBSchema>['primaryId']>(idA: DBSchema[ID], idB: DBSchema[ID], idKey?: ID): Promise<Feedback> {
    if (idA == null || idA == null) throw noID()

    const count = await this._countRaw({ [idKey || this.primaryId]: idA } as Partial<DBSchema>)
    if (!count) throw noEntry(idA)

    const success = await this._swap(idA, idB, idKey)
    return { success }
  }


  /** Use to call Custom SQL (And run result though adapter)
   *  - WARNING! sql IS NOT CHECKED FOR INJECTION, DON'T PASS UNSANITIZED UI 
   * @param sql - SQL command to execute (Must be 1 command)
   *  - Check sqlite3 API documentation under "all()" for more details
   * @param params - Array of parameters to safely insert into SQL command
   *  - Check sqlite3 API documentation under "all()" for more details
   * @param raw - Skip getAdapters, return raw DB values
   * @returns SQL response as an array of objects representing DB records
   *  - WARNING! Return type is unknown[], should be manually cast
   */
  async custom(sql: string, params?: { [key: string]: any } | any[], raw?: boolean): Promise<unknown[]> {
    let result = await all(getDb(), sql, params)
    result = result.map(caseInsensitiveObject)
    if (raw) return result
    return Promise.all(result.map((data) => runAdapters(adapterTypes.get, data, this)))
  }



  // Base SQL //

  /** Run SELECT COUNT query using raw WHERE data */
  async _countRaw(whereData: WhereData<DBSchema> = {}): Promise<number> {
    const result = await get<{ count: number }>(
      getDb(),
      ...countSQL(this.title, getSqlParams(this, whereData))
    )
    return result.count
  }

  /** Run SELECT query using WHERE data & SQL Options (WHERE is RAW DB VALUES) */
  private async _selectRaw<O extends SQLOptions<DBSchema>>(where: WhereData<DBSchema> | undefined, options: O): SelectResult<O, DBSchema> {
    
    const result = await all(getDb(), ...selectSQL(
      this.title,
      this.primaryId,
      getSqlParams(this, where),
      options.skipChildren ? Object.keys(this.children) : [],
      options.orderKey
    ))

    return result.map(caseInsensitiveObject)
  }


  /** Run SELECT query using WHERE data & SQL Options (WHERE is PRE-ADAPTER SCHEMA) */
  private async _select<O extends SQLOptions<DBSchema>>(where: WhereData<Schema> | undefined, options: O) {
    
    let whereData: WhereData<DBSchema> | undefined

    if (where)
      whereData = await runAdapters(adapterTypes.set, where, this)

    return this._selectRaw(whereData, options)
  }


  /** Execute INSERT command using DATA values, IFEXISTS behavior if matching record exists,
   * and returning last record if RETURNLAST is true (Otherwise it returns TRUE/FALSE if successful) */
  private async _insert(data: Schema[], ifExists: IfExistsBehavior, returnLast: false): Promise<boolean>;
  private async _insert(data: Schema[], ifExists: IfExistsBehavior, returnLast: true):  Promise<DBSchema>;
  private async _insert(data: Schema[], ifExists: IfExistsBehavior, returnLast: boolean): Promise<DBSchema|boolean>;
  private async _insert(data: Schema[], ifExists: IfExistsBehavior, returnLast: boolean): Promise<DBSchema|boolean> {
    if (!data.length) throw noData('batch data')

    // Adapt/Sanitize data
    const dataArray = await Promise.all(data.map(
      (entry) => runAdapters(adapterTypes.set, { ...this.defaults, ...entry }, this)
    ))
    
    const keys = splitKeys(dataArray[0], this.children)
    if (!keys.parent.length && !keys.children.length) throw noData()
    
    const params = insertSQL(this.title, dataArray, keys.parent, ifExists)
    const missingPrimary = !keys.parent.includes(this.primaryId)

    // Update DB

    const lastEntry = await (returnLast || missingPrimary ? getLastEntry(getDb(), ...params, this.title) : run(getDb(), ...params))
    if (!keys.children.length) return !returnLast || lastEntry
    
    // Get rowId if primaryId wasn't provided
    if (missingPrimary && typeof lastEntry[this.primaryId] !== 'number') throw noPrimary(this.title,'add')
    const primaryKey = !missingPrimary ? this.primaryId : lastEntry[this.primaryId] - dataArray.length
    
    await run(getDb(), ...childSQL(this.title, dataArray, keys.children, primaryKey, ifExists))
    return !returnLast || lastEntry
  }


  /** Execute UPDATE command using DATA values on records match WHERE values
   *  and calling ONCHANGE if provided (Returns TRUE/FALSE if successful) */
  private async _update(data: UpdateData<Schema>, whereData: WhereData<DBSchema>, { onChange }: SQLOptions<DBSchema>) {
    
    // Adapt/Sanitize data
    if (!Object.keys(whereData).length) throw noID()
    let updateData = await runAdapters(adapterTypes.set, data, this)
    if (!Object.keys(updateData).length) throw noData()

    // Find matching entries
    let ids = [(whereData as Partial<DBSchema>)[this.primaryId]] // simple method

    if (ids[0] == null || onChange) { // complex method

      const currentData = await this._selectRaw(whereData, { skipChildren: !!onChange })

      ids = currentData.map((entry) => entry[this.primaryId]).filter((id) => id != null)
      if (!ids.length) throw noEntry(JSON.stringify(whereData))

      if (ids.length > 1) logger.verbose(`ALERT! Updating ${ids.length} rows of table ${this.title} with one statement.`)

      if (onChange) {
        // Run onChange callback here to avoid re-fetching 'currentData'
        const changed = await onChange(updateData, currentData)
        if (changed) updateData = changed
        updateData = sanitizeSchemaData(updateData, this)
      }
    }

    // Final error check
    if (!Object.keys(updateData).length) throw noData()
    if (this.primaryId in updateData)    throw updatePrimary(this.primaryId, this.title)
    
    // Update DB
    const keys = splitKeys(updateData, this.children)
    if (!keys.parent.length && !keys.children.length) throw noData('update data after onChangeCallback')

    if (keys.parent.length) await run(getDb(), ...updateSQL(
      this.title,
      updateData,
      keys.parent,
      getSqlParams(this, whereData)
    ))

    if (keys.children.length) await run(getDb(), ...childSQL(
      this.title,
      ids.map((id) => ({ ...updateData, [this.primaryId]: id })),
      keys.children,
      this.primaryId,
      ifExistsBehaviors.abort,
      true,
    ))

    return true
  }


  /** Execute DELETE command on one or more of ID values that match IDKEY (Or Primary ID if none provided)
   * (Returns TRUE/FALSE if successful) */
  private async _delete(whereData: WhereData<DBSchema>) {
    if (!Object.keys(whereData).length) throw noID()
    
    await run(getDb(), ...deleteSQL(this.title, getSqlParams(this, whereData)))
    return true
  }


  /** Swap the ID values of one or two records using IDKEY (Or Primary ID if none given)
   * (Returns TRUE/FALSE if successful) */
  private async _swap<ID extends Model<Schema,DBSchema>['primaryId']>(idA: DBSchema[ID], idB: DBSchema[ID], idKey?: ID) {
    if (!idA || !idB) throw noID()

    await multiRun(getDb(), swapSQL(this.title, idKey || this.primaryId, idA, idB, this._tmpID))
    return true
  }
  

  // Private getters
  /** Model name and DB table title */
  get title() { return this._title }
  /** Name of primary key used to ID records */
  get primaryId() { return this._primaryId }
  /** Boolean indicating if this model is not the parent model */
  get isChildModel() { return this._isChildModel }
  /** A list of Keys that only appear in the DB */
  get hidden() { return this._hidden }
  /** An object containing the default values to be used when creating a record */
  get defaults() { return this._defaults }
  /** Definition schema */
  get schema() { return this._schema }
  /** Definition schema of child entries */
  get children() { return this._children }
  /** URL path for model */
  get url() { return this.isChildModel ? getChildPath(this.title) : this.title }
  
  // Check for injection on set
  set title(newTitle) { this._title = checkInjection(newTitle) }
  set primaryId(newId) { this._primaryId = checkInjection(newId, this.title) }
  set schema(newSchema) {
    this._children = extractChildren(checkInjection(newSchema, this.title), newSchema[this.primaryId])
    this._schema = newSchema
    this._defaults = mapToField(newSchema, 'default')
    this._hidden = Object.keys(newSchema).filter((key) => newSchema[key].dbOnly)
  }
}

export type ModelBase<Schema extends SchemaBase = any, DBSchema extends SchemaBase = Schema> = InstanceType<typeof Model<Schema, DBSchema>>