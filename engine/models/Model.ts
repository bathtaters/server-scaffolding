import type {
  SchemaOf, AddSchemaOf, DBSchemaOf, ViewSchemaOf, DefaultSchemaOf, DBSchemaKeys,
  DefinitionSchema, DefinitionSchemaNormal, AdapterDefinition,
  TypeOfID, IDOf, PrimaryIDOf, IDOption, SQLOptions,
  Page, FindResult, SelectResult, Feedback,
  ForeignKeyRef, ChildDefinitions, ChildKey,
} from '../types/Model.d'
import type { CreateSchema, IfExistsBehavior, UpdateData, WhereData } from '../types/db.d'
import logger from '../libs/log'
import { childLabel, adapterTypes } from '../types/Model'
import { ifExistsBehaviors } from '../types/db'
import { openDb, getDb } from '../libs/db'
import { all, get, run, reset, getLastEntry, multiRun } from '../services/db.services'
import { adaptSchema, getPrimaryId, runAdapters, extractChildren, buildAdapters  } from '../services/model.services'
import { checkInjection, appendAndSort, insertSQL, selectSQL, countSQL, updateSQL, deleteSQL, swapSQL } from '../utils/db.utils'
import { caseInsensitiveObject, mapToField, isIn, getVal } from '../utils/common.utils'
import { sanitizeSchemaData, childTableRefs, getSqlParams, childSQL, splitKeys } from '../utils/model.utils'
import { getChildName, getChildPath } from '../config/models.cfg'
import { noID, noData, noEntry, noPrimary, noSize, badKey, multiAction, updatePrimary } from '../config/errors.engine'

// TODO -- Create PageData object & move selectSQL call from this.getPage into this._select
// TODO -- Create base onUpdate/onCreate callbacks that are called whenever an Update/Create call is made

/** Base Model Class, each instance represents a separate model */
export default class Model<Def extends DefinitionSchema> {
  private _title:        string
  private _schema:       DefinitionSchemaNormal<Def>
  private _adapters:     AdapterDefinition<Def>
  private _primaryId:    PrimaryIDOf<Def>
  private _isChildModel: boolean

  private   _defaults: DefaultSchemaOf<Def>
  private   _masked:   Array<keyof Def>
  protected _children: ChildDefinitions<Def>

  /** Promise that will resolve to TRUE once DB is connected and Model is created */
  readonly isInitialized: Promise<boolean>
  private _tmpID = -0xFF /* Temporary ID to use for swapping */

  /** Create a DB connection to the given model
   * @param title            - Model Identifier
   * @param schemaDefinition - Model Schema
   *                         - Property keys will map to DB column & Form ID 
   *                         - See 'Definition' Type for additional documentation)
   * @param adapters         - (Optional) Override default adapters { adapterType: { schemaKey: adapterFunction } }
   *                         - Adapter Types: to/from DB, to/from GUI (HTML Form) */
  constructor(title: string, schemaDefinition: Def, adapters?: Partial<AdapterDefinition<Def>>)
  /**  Don't use if you don't know what you're doing, this overload is for the engine to create sub-tables */
  constructor(title: string, schemaDefinition: Def, adapters?: Partial<AdapterDefinition<Def>>, isChildModel?: boolean)

  constructor(title: string, schemaDefinition: Def, adapters: Partial<AdapterDefinition<Def>> = {}, isChildModel = false) {
    // Set basic properties
    this._title        = checkInjection(title)
    this._isChildModel = isChildModel

    // Set main schema -- Checking keys for injection
    this._primaryId = getPrimaryId(schemaDefinition, this._title, this._isChildModel)
    this._schema    = checkInjection(adaptSchema(schemaDefinition), this._title)
    this._children  = extractChildren(this._schema, this._schema[this._primaryId])

    // Set additional properties
    this._adapters = buildAdapters(adapters, this._schema)
    this._defaults = mapToField(this._schema, 'default') as any
    this._masked   = Object.keys(this._schema).filter((key) => this._schema[key].isMasked)

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
  getChildModel(childName: ChildKey<Def>) {
    const schema = this.children[childName]
    if (!schema) return undefined
    return new Model(getChildName(this.title, childName), schema, undefined, true)
  }


  /** Get paginated data
   * @param page - Page number (1-indexed)
   * @param size - Page size (Must be at least 1)
   * @param reverseSort - (Optional) If true, order data descending
   * @param orderKey - (Optional) Column to order data by
   * @returns Page of data as an array
   */
  async getPage(page: number, size: number, reverseSort?: boolean, orderKey?: DBSchemaKeys<Def>): Promise<SchemaOf<Def>[]> {
    if (size < 1 || page < 1) return Promise.reject(noSize())

    if (orderKey != null && (typeof orderKey !== 'string' || (orderKey && !isIn(orderKey, this.schema))))
      throw badKey(orderKey, this.title)
    
    let result = await all<DBSchemaOf<Def>>(getDb(), ...selectSQL(
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
  async getPageData(location: Page.Location, { defaultSize = 5, sizeList = [], startPage = 1 }: Page.Options = {}): Promise<Page.Data<Def>> {
    const total = await this.count()
    const size = location.size || defaultSize
    const pageCount = Math.ceil(total / size)
    const page = Math.max(1, Math.min(location.page || startPage, pageCount))
    const sizes = pageCount > 1 || total > Math.min(...sizeList) ? appendAndSort(sizeList, size) : undefined
    
    // TODO -- Run trough HTML adapter
    const data = await this.getPage(page, size) as any as ViewSchemaOf<Def>[]
  
    return { data, page, pageCount, size, sizes }
  }



  // Base API //

  /** Create and/or connect to model in database
   * @param overwrite - If true, erase the table
   * @returns Feedback object { success: true/false }
   */
  async create(overwrite?: boolean): Promise<Feedback> {
    
    let dbSchema: Record<string, CreateSchema> = { [this.title]: mapToField(this.schema, 'db') },
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
   *              - Can also use { key: whereLogic OR { whereOp: value } } instead of { key: value }
   *              - WhereLogic is { $and/$or: [ ...WhereData ] } OR { $not: WhereData }
   *              - WhereOps are: $gt(e), $lt(e), $eq, $in (Partial match)
   * @returns Count of matching records (or all records if 'where' is omitted)
   */
  async count(where?: WhereData<SchemaOf<Def>>): Promise<number> {
    const whereData = where && await runAdapters(adapterTypes.set, where, this)
    return this._countRaw(whereData)
  }

  /** Get the first record that matches the given ID
   * @param id      - ID value to lookup
   * @param options - (Optional) Lookup options
   * @param options.idKey        - (Default: Primary ID) Key of ID to lookup
   * @param options.orderKey     - Order results by this key
   * @param options.skipChildren - Avoid joins, returned value will not include children
   * @param options.raw          - Skip getAdapters, return raw DB values
   * @returns First record matching ID, or undefined if no match
   */
  async get<O extends SQLOptions<Def> & IDOption<Def>>(
    id: TypeOfID<Def, O['idKey']>,
    { idKey, ...options } = {} as O
  ) {
    
    const [data] = await this.find({ [idKey || this.primaryId]: id }, options)
    return data
  }

  /** Lookup and return multiple records
   * @param where   - Key/Value pairs to return matches of
   *                - Can also use { [whereOp/whereLogic]: value } instead of value
   *                - WhereOps are: $gt(e), $lt(e), $eq, $in (Partial match)
   *                -  WhereLogic is { $and/$or: [ ...WhereData ] }, { $not: WhereData }
   * @param options - (Optional) Lookup options
   * @param options.orderKey     - Order results by this key
   * @param options.skipChildren - Avoid joins, returned value will not include children
   * @param options.raw          - Skip getAdapters, return raw DB values
   * @returns Array of all records that satisfy parameters
   */
  async find<O extends SQLOptions<Def>>(
    where?: WhereData<SchemaOf<Def>>,
    options = {} as O
  ): FindResult<Def,O> {
    
    const result = await this._select(where, options)
    return options.raw ? result as any :
      Promise.all(result.map((data) => runAdapters(adapterTypes.get, data, this)))
  }
  
  
  /** Add entrie(s) to database
   * @param data     - Array of new entries as objects
   * @param ifExists - How to handle non-unique entries (Default: default)
   * @returns Feedback object { success: true/false }
   */
  async add(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior = 'default'): Promise<Feedback> {
    const success = await this._insert(data, ifExists, false)
    return ({ success })
  }

  /** Add entrie(s) to database, returning last entry added
   * @param data - Array of new entries as objects
   * @param ifExists - How to handle non-unique entries (Default: default)
   * @returns Record of last entry (After adding to DB)
   */
  addAndReturn(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior = 'default'): Promise<DBSchemaOf<Def>> {
    return this._insert(data, ifExists, true)
  }


  /** Update given data fields in record matching ID
   *    - Doesn't modify any keys not present in "data"
   *    - Checks if ID exists before updating
   * @param id      - ID value to lookup
   * @param data    - Key/Value object to update matching record to
   * @param options - (Optional) Update options
   * @param options.idKey    - (Default: Primary ID) Key of ID to lookup
   * @param options.onChange - Function called immediately before records are updated (can be async)
   *                         - (update, matching) => newValue | void
   *                         - 'update' = Keys/Values to Update (Post-adapter)
   *                         - 'matching' = Array of records that will be updated (pre-adapter/no joins))
   *                         - return = New value for 'update' to OR void + mutates 'update' param
   * @returns Feedback object { success: true/false }
   */
  async update<O extends SQLOptions<Def> & IDOption<Def>>(
    id: TypeOfID<Def, O['idKey']>,
    data: UpdateData<AddSchemaOf<Def>>,
    { idKey, ...options } = {} as O
  ) {
    if (id == null) throw noID()

    const whereData = await runAdapters(adapterTypes.set, { [idKey || this.primaryId]: id }, this)

    const count = await this._countRaw(whereData)
    if (!count) throw noEntry(id)
    if (count !== 1) throw multiAction('Updating',count)

    const success = await this._update(data, whereData, options)
    return { success }
  }


  /** Update given data fields in record matching "where"
   *    - Doesn't modify any keys not present in "data"
   *    - Doesn't check if IDs exist before updating
   * @param where   - Key/Value pairs to select data for updating
   *                - Can also use { [whereOp/whereLogic]: value } instead of value
   *                - WhereOps are: $gt(e), $lt(e), $eq, $in (Partial match)
   *                - WhereLogic is { $and/$or: [ ...WhereData ] }, { $not: WhereData }
   * @param data    - Key/Value object to update matching record to
   * @param options - (Optional) Update options
   * @param options.onChange - Function called immediately before records are updated (can be async)
   *                         - (update, matching) => newValue | void
   *                         - 'update' = Keys/Values to Update (Post-adapter)
   *                         - 'matching' = Array of records that will be updated (pre-adapter/no joins))
   *                         - return = New value for 'update' to OR void + mutates 'update' param
   * @returns Feedback object { success: true/false }
   */
  async batchUpdate(where: WhereData<SchemaOf<Def>>, data: UpdateData<AddSchemaOf<Def>>, options: SQLOptions<Def> = {}): Promise<Feedback> {
    const whereData = await runAdapters(adapterTypes.set, where, this)
    const success = await this._update(data, whereData, options)
    return { success }
  }
  

  /** Remove record(s) matching ID
   *    - Checks if ID exists before removing
   * @param id    - ID value to remove
   * @param idKey - (Default: Primary ID) Key of ID to remove
   * @returns Feedback object { success: true/false }
   */
  async remove<ID extends IDOf<Def> | undefined>(id: TypeOfID<Def, ID>, idKey?: ID): Promise<Feedback> {
    if (id == null) throw noID()

    const whereData = await runAdapters(
      adapterTypes.set,
      { [idKey || this.primaryId]: id },
      this
    )

    const count = await this._countRaw(whereData)
    if (!count) throw noEntry(id)
    if (count !== 1) throw multiAction('Deleting',count)

    const success = await this._delete(whereData)
    return { success }
  }

  /** Remove record(s) matching ID
   *    - Doesn't check if IDs exist before removing
   * @param where - Key/Value pairs to remove matches of
   *              - Can also use { [whereOp/whereLogic]: value } instead of value
   *              - WhereOps are: $gt(e), $lt(e), $eq, $in (Partial match)
   *              - WhereLogic is { $and/$or: [ ...WhereData ] }, { $not: WhereData }
   * @returns Feedback object { success: true/false }
   */
  async batchRemove(where: WhereData<SchemaOf<Def>>): Promise<Feedback> {
    const whereData = await runAdapters(adapterTypes.set, where, this)
    const success = await this._delete(whereData)
    return { success }
  }


  /** Swap the IDs of 2 records
   *  - Checks if 1st ID exists before swapping, if missing 2nd ID just rename 1st ID
   * @param idA - ID value to swap from
   * @param idB - ID value to swap with
   * @param idKey - (Default: Primary ID) Key of ID A & B values
   * @returns Feedback object { success: true/false }
   */
  async swap<ID extends IDOf<Def> | undefined>(idA: TypeOfID<Def,ID>, idB:TypeOfID<Def,ID>, idKey?: ID): Promise<Feedback> {
    if (idA == null || idA == null) throw noID()

    const count = await this._countRaw({ [idKey || this.primaryId]: idA })
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
  async _countRaw(whereData: WhereData<DBSchemaOf<Def>> = {}): Promise<number> {
    const result = await get<{ count: number }>(
      getDb(),
      ...countSQL(this.title, getSqlParams(this, whereData))
    )
    return result.count
  }

  /** Run SELECT query using WHERE data & SQL Options (WHERE is RAW DB VALUES) */
  private async _selectRaw<O extends SQLOptions<Def>>(where: WhereData<DBSchemaOf<Def>> | undefined, options: O): SelectResult<Def, O> {
    
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
  private async _select<O extends SQLOptions<Def>>(where: WhereData<SchemaOf<Def>> | undefined, options: O) {
    
    let whereData: WhereData<DBSchemaOf<Def>> | undefined

    if (where)
      whereData = await runAdapters(adapterTypes.set, where, this)

    return this._selectRaw(whereData, options)
  }


  /** Execute INSERT command using DATA values, IFEXISTS behavior if matching record exists,
   * and returning last record if RETURNLAST is true (Otherwise it returns TRUE/FALSE if successful) */
  private async _insert(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior, returnLast: false): Promise<boolean>;
  private async _insert(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior, returnLast: true):  Promise<DBSchemaOf<Def>>;
  private async _insert(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior, returnLast: boolean): Promise<DBSchemaOf<Def>|boolean>;
  private async _insert(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior, returnLast: boolean): Promise<DBSchemaOf<Def>|boolean> {
    if (!data.length) throw noData('batch data')

    // Adapt/Sanitize data
    const dataArray: DBSchemaOf<Def>[] = await Promise.all(data.map(
      (entry) => runAdapters(adapterTypes.set, this._applyDefaults(entry), this)
    ))
    
    const keys = splitKeys(dataArray[0], this.children)
    if (!keys.parent.length && !keys.children.length) throw noData()
    
    // Generate SQL
    const params = insertSQL(this.title, dataArray, keys.parent, ifExists)
    const missingPrimary = !keys.parent.includes(this.primaryId)

    // Update Base DB
    const lastEntry = await (returnLast || missingPrimary ? getLastEntry(getDb(), ...params, this.title) : run(getDb(), ...params))
    if (!keys.children.length) return !returnLast || lastEntry
    
    // Get rowId if primaryId wasn't provided
    if (missingPrimary && typeof lastEntry[this.primaryId] !== 'number') throw noPrimary(this.title,'add')
    const primaryKey = !missingPrimary ? this.primaryId : lastEntry[this.primaryId] - dataArray.length
    
    // Update Child DBs
    await multiRun(getDb(), childSQL(this.title, dataArray, keys.children, primaryKey, ifExists))
    return !returnLast || lastEntry
  }


  /** Execute UPDATE command using DATA values on records match WHERE values
   *  and calling ONCHANGE if provided (Returns TRUE/FALSE if successful) */
  private async _update(data: UpdateData<AddSchemaOf<Def>>, whereData: WhereData<DBSchemaOf<Def>>, { onChange }: SQLOptions<Def>) {
    
    // Adapt/Sanitize data
    if (!Object.keys(whereData).length) throw noID()
    let updateData = await runAdapters(adapterTypes.set, data, this)
    if (!Object.keys(updateData).length) throw noData()

    // Find matching entries
    let ids: DBSchemaOf<Def>[IDOf<Def>][] = [(whereData as any)[this.primaryId]] // simple method

    if (ids[0] == null || onChange) { // complex method

      const currentData = await this._selectRaw(whereData, { skipChildren: !!onChange })

      ids = currentData.filter((entry) => this.primaryId in entry).map((entry: any) => entry[this.primaryId])
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

    if (keys.children.length) await multiRun(getDb(), childSQL(
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
  private async _delete(whereData: WhereData<DBSchemaOf<Def>>) {
    if (!Object.keys(whereData).length) throw noID()
    
    await run(getDb(), ...deleteSQL(this.title, getSqlParams(this, whereData)))
    return true
  }


  /** Swap the ID values of one or two records using IDKEY (Or Primary ID if none given)
   * (Returns TRUE/FALSE if successful) */
  private async _swap<ID extends IDOf<Def> | undefined>(idA: TypeOfID<Def,ID>, idB: TypeOfID<Def,ID>, idKey?: ID) {

    const idAdb = await this._adaptProperty(idKey || this.primaryId, idA)
    const idBdb = await this._adaptProperty(idKey || this.primaryId, idB)
    
    if (idAdb == null || idBdb == null) throw noID()

    await multiRun(getDb(), swapSQL(
      this.title,
      idKey || this.primaryId,
      idAdb, idBdb,
      this._tmpID,
      Object.keys(this.children))
    )
    return true
  }

  
  /** Adapt ID from Base Schema to DB Schema */
  private async _adaptProperty(key: keyof Def, val: SchemaOf<Def>[any]): Promise<DBSchemaOf<Def>[any]> {
    const result = await this.adaptData(adapterTypes.toDB, { [key]: val })
    return getVal(result, key) ?? val as any
  }

  /** Insert default properties in place of any undefined properties */
  private _applyDefaults(data: AddSchemaOf<Def>) {
    return { ...this.defaults, ...data }
  }
  

  // Readonly Getters
  /** Model name and DB table title */
  get title() { return this._title }
  /** Name of primary key used to ID records */
  get primaryId() { return this._primaryId }
  /** Boolean indicating if this model is not the parent model */
  get isChildModel() { return this._isChildModel }
  /** A list of Keys that only appear in the DB */
  get masked() { return this._masked }
  /** An object containing the default values to be used when creating a record */
  get defaults() { return this._defaults }
  /** Definition schema */
  get schema() { return this._schema }
  /** Definition adapters */
  get adapters() { return this._adapters }
  /** Definition schema of child entries */
  get children() { return this._children }
  /** URL path for model */
  get url() { return this.isChildModel ? getChildPath(this.title) : this.title }
}

export type GenericModel<Def extends DefinitionSchema = DefinitionSchema> =
  Omit<InstanceType<typeof Model<Def>>, 'primaryId'> & { primaryId: keyof Def }