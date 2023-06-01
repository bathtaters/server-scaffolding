import type {
  SchemaOf, AddSchemaOf, DBSchemaOf, DefaultSchemaOf, DBSchemaKeys,
  DefinitionSchema, DefinitionSchemaNormal, AdapterDefinition, GenericDefinitionSchema,
  TypeOfID, IDOf, PrimaryIDOf, IDOption, SQLOptions,
  Page, FindResult, SelectResult, Feedback,
  AdapterType, AdapterIn, AdapterOut, AdapterData,
  ForeignKeyRef, ChildDefinitions, ChildKey, SkipChildren, 
} from '../types/Model.d'
import type { CreateSchema, IfExistsBehavior, UpdateData, WhereData } from '../types/db.d'
import logger from '../libs/log'
import { childLabel, adapterTypes } from '../types/Model'
import { ifExistsBehaviors } from '../types/db'
import { openDb, getDb } from '../libs/db'
import { all, get, run, reset, getLastEntry, multiRun } from '../services/db.services'
import { adaptSchema, getPrimaryId, runAdapters, extractChildren, buildAdapters, errorCheckModel  } from '../services/model.services'
import { appendAndSort, insertSQL, selectSQL, countSQL, updateSQL, deleteSQL, swapSQL } from '../utils/db.utils'
import { caseInsensitiveObject, mapToField, isIn, getVal } from '../utils/common.utils'
import { sanitizeSchemaData, childTableRefs, getSqlParams, childSQL, splitKeys } from '../utils/model.utils'
import { getChildName, getChildPath } from '../config/models.cfg'
import { noID, noData, noEntry, noPrimary, noSize, badKey, multiAction, updatePrimary } from '../config/errors.engine'

// TODO -- Fix Change User Password / Test All User Actions, Profile Actions, Logs, Settings, Etc

// TODO -- Auto-derive Definition.db of ExtendType based on return type of valueOf() (string or int)

// TODO -- Create PageData object & move selectSQL call from this.getPage into this._select
// TODO -- Create base onUpdate/onCreate callbacks that are called whenever an Update/Create call is made

// TODO -- DOUBLE CHECK ADAPTERS W/ VALIDATORS + FORM DATA


/** Base Model Class, each instance represents a separate model */
export default class Model<Def extends DefinitionSchema, Title extends string> {
  private _title:        Title
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
  constructor(title: Title, schemaDefinition: Def, adapters?: Partial<AdapterDefinition<Def>>)
  /**  Don't use if you don't know what you're doing, this overload is for the engine to create sub-tables */
  constructor(title: Title, schemaDefinition: Def, adapters?: Partial<AdapterDefinition<Def>>, isChildModel?: boolean)

  constructor(title: Title, schemaDefinition: Def, adapters: Partial<AdapterDefinition<Def>> = {}, isChildModel = false) {
    // Set basic properties
    this._title        = title
    this._isChildModel = isChildModel

    // Set main schema (Checking keys for injection)
    this._primaryId = getPrimaryId(schemaDefinition, this._title, this._isChildModel)
    this._schema    = adaptSchema(schemaDefinition)
    this._children  = extractChildren(this._schema, this._primaryId)

    // Set additional properties
    this._adapters = buildAdapters(adapters, this._schema)
    this._defaults = mapToField(this._schema, 'default') as any
    this._masked   = Object.keys(this._schema).filter((key) => this._schema[key].isMasked)

    errorCheckModel(this._title, this._schema)

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
  getChildModel<N extends ChildKey<Def> & string>(childName: N) {
    const schema = this.children[childName]
    if (!schema) throw new Error(`ChildModel doesn't exist for ${String(childName)} on ${this.title}.`)
    return new Model(getChildName(this.title, childName), schema, undefined, true)
  }


  /** Get paginated data
   * @param page - Page number (1-indexed)
   * @param size - Page size (Must be at least 1)
   * @param asc - (Optional) If true, order data descending
   * @param sort - (Optional) Column to order data by
   * @returns Page of data as an array
   */
  async getPage(page: number, size: number, asc?: boolean, sort?: DBSchemaKeys<Def>): Promise<SchemaOf<Def>[]> {
    if (size < 1 || page < 1) return Promise.reject(noSize())

    if (sort != null && (typeof sort !== 'string' || (sort && !isIn(sort, this.schema))))
      throw badKey(sort, this.title)
    
    const data = await all<DBSchemaOf<Def>>(getDb(), ...selectSQL(
      this.title,
      this.primaryId,
      [],
      Object.keys(this.children),
      sort,
      asc,
      size,
      page - 1
    ))

    return this.adaptData(adapterTypes.fromDB, data)
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
    
    const rawData = await this.getPage(page, size)
    const data = await this.adaptData(adapterTypes.toUI, rawData)
  
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
  async count(where?: WhereData<SchemaOf<Def,false>>): Promise<number> {
    const whereData = where && await this.adaptData(adapterTypes.toDB, where)
    return this._countRaw(whereData)
  }

  /** Get the first record that matches the given ID
   * @param id      - ID value to lookup
   * @param options - (Optional) Lookup options
   * @param options.idKey        - (Default: Primary ID) Key of ID to lookup
   * @param options.orderKey     - Order results by this key
   * @param options.skipChildren - Avoid joins, returned value will not include children
   * @param options.raw          - Skip fromDbAdapters, return raw DB values
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
   * @param options.raw          - Skip fromDbAdapters, return raw DB values
   * @returns Array of all records that satisfy parameters
   */
  async find<O extends SQLOptions<Def>>(
    where?: WhereData<SchemaOf<Def,false>>,
    options = {} as O
  ): FindResult<Def,O> {
    
    const data = await this._select(where, options)
    return options.raw ? data as any : this.adaptData(adapterTypes.fromDB, data)
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
  addAndReturn(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior = 'default') {
    return this._insert(data, ifExists, true)
  }


  /** Update given data fields in record matching ID
   *    - Doesn't modify any keys not present in "data"
   *    - Confirms that ID matches exactly 1 entry before updating
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

    const whereData = { [idKey || this.primaryId]: id }

    const count = await this.count(whereData)
    if (!count) throw noEntry(id)
    if (count !== 1) throw multiAction('Updating',count)

    return this.batchUpdate(whereData, data, options)
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
  async batchUpdate(where: WhereData<SchemaOf<Def,false>>, data: UpdateData<AddSchemaOf<Def>>, options: SQLOptions<Def> = {}): Promise<Feedback> {
    const whereData = await this.adaptData(adapterTypes.toDB, where)
    const success = await this._update(data, whereData, options)
    return { success }
  }
  

  /** Remove record(s) matching ID
   *    - Confirms that ID matches exactly 1 entry before removing
   * @param id    - ID value to remove
   * @param idKey - (Default: Primary ID) Key of ID to remove
   * @returns Feedback object { success: true/false }
   */
  async remove<ID extends IDOf<Def> | undefined>(id: TypeOfID<Def, ID>, idKey?: ID): Promise<Feedback> {
    if (id == null) throw noID()

    const whereData = { [idKey || this.primaryId]: id }

    const count = await this.count(whereData)
    if (!count) throw noEntry(id)
    if (count !== 1) throw multiAction('Deleting',count)

    return this.batchRemove(whereData)
  }

  /** Remove record(s) matching ID
   *    - Doesn't check if IDs exist before removing
   * @param where - Key/Value pairs to remove matches of
   *              - Can also use { [whereOp/whereLogic]: value } instead of value
   *              - WhereOps are: $gt(e), $lt(e), $eq, $in (Partial match)
   *              - WhereLogic is { $and/$or: [ ...WhereData ] }, { $not: WhereData }
   * @returns Feedback object { success: true/false }
   */
  async batchRemove(where: WhereData<SchemaOf<Def,false>>): Promise<Feedback> {
    const whereData = await this.adaptData(adapterTypes.toDB, where)
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
   * @param raw - Skip fromDbAdapters, return raw DB values
   * @returns SQL response as an array of objects representing DB records
   *  - WARNING! Return type is unknown[], should be manually cast
   */
  async custom(sql: string, params?: { [key: string]: any } | any[], raw?: boolean): Promise<unknown[]> {
    const result = await all(getDb(), sql, params)
    return raw ? result.map(caseInsensitiveObject)
      : this.adaptData(adapterTypes.fromDB, result) as Promise<unknown[]>
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
  private async _select<O extends SQLOptions<Def>>(where: WhereData<SchemaOf<Def,false>> | undefined, options: O) {
    
    let whereData: WhereData<DBSchemaOf<Def>> | undefined

    if (where)
      whereData = await this.adaptData(adapterTypes.toDB, where)

    return this._selectRaw(whereData, options)
  }


  /** Execute INSERT command using DATA values, IFEXISTS behavior if matching record exists,
   * and returning last record if RETURNLAST is true (Otherwise it returns TRUE/FALSE if successful) */
  private async _insert(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior, returnLast: false):   Promise<boolean>;
  private async _insert(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior, returnLast: true):    Promise<SkipChildren<DBSchemaOf<Def>,Def>>;
  private async _insert(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior, returnLast: boolean): Promise<SkipChildren<DBSchemaOf<Def>,Def>|boolean>;
  private async _insert(data: AddSchemaOf<Def>[], ifExists: IfExistsBehavior, returnLast: boolean): Promise<SkipChildren<DBSchemaOf<Def>,Def>|boolean> {
    if (!data.length) throw noData('batch data')

    // Apply defaults, then adapt data
    const fullData = data.map<DefaultSchemaOf<Def> & AddSchemaOf<Def>>(this._applyDefaults.bind(this))
    const dataArray: DBSchemaOf<Def>[] = await this.adaptData(adapterTypes.toDB, fullData)
    
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
    let updateData = await this.adaptData(adapterTypes.toDB, data)
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
  private async _adaptProperty(key: keyof Def, val: SchemaOf<Def,false>[any]): Promise<DBSchemaOf<Def>[any]> {
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



  // Infinite adapter definitions

  /** Run adapters on full data 
   * @param data - Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data
   */
  adaptData<A extends AdapterType>(adapterType: A, data: AdapterIn<Def,A>): Promise<AdapterOut<Def,A>>;
  /** Run adapters on childless data 
   * @param data - Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data
   */
  adaptData<A extends AdapterType>(adapterType: A, data: SkipChildren<AdapterIn<Def,A>,Def>): Promise<SkipChildren<AdapterOut<Def,A>,Def>>;
  /** Run adapters on partial data 
   * @param data - Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data
   */
  adaptData<A extends AdapterType>(adapterType: A, data: Partial<AdapterIn<Def,A>>): Promise<Partial<AdapterOut<Def,A>>>;
  /** Run adapters on where data 
   * @param data - Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data
   */
  adaptData<A extends AdapterType>(adapterType: A, data: WhereData<AdapterIn<Def,A>>): Promise<WhereData<AdapterOut<Def,A>>>;
  /** Run adapters on update data 
   * @param data - Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data
   */
  adaptData<A extends AdapterType>(adapterType: A, data: UpdateData<AdapterIn<Def,A>>): Promise<UpdateData<AdapterOut<Def,A>>>;
  /** Run adapters on any data 
   * @param data - Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data
   */
  adaptData<A extends AdapterType>(adapterType: A, data: AdapterData<AdapterIn<Def,A>>): Promise<AdapterData<AdapterOut<Def,A>>>;

  /** Run adapters on full data array 
   * @param dataArray - Array of Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data array
   */
  adaptData<A extends AdapterType>(adapterType: A, dataArray: AdapterIn<Def,A>[]): Promise<AdapterOut<Def,A>[]>;
  /** Run adapters on childless data array 
   * @param dataArray - Array of Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data array
   */
  adaptData<A extends AdapterType>(adapterType: A, dataArray: SkipChildren<AdapterIn<Def,A>,Def>[]): Promise<SkipChildren<AdapterOut<Def,A>,Def>[]>;
  /** Run adapters on partial data array 
   * @param dataArray - Array of Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data array
   */
  adaptData<A extends AdapterType>(adapterType: A, dataArray: Partial<AdapterIn<Def,A>>[]): Promise<Partial<AdapterOut<Def,A>>[]>;
  /** Run adapters on where data array 
   * @param dataArray - Array of Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data array
   */
  adaptData<A extends AdapterType>(adapterType: A, dataArray: WhereData<AdapterIn<Def,A>>[]): Promise<WhereData<AdapterOut<Def,A>>[]>;
  /** Run adapters on update data array 
   * @param dataArray - Array of Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data array
   */
  adaptData<A extends AdapterType>(adapterType: A, dataArray: UpdateData<AdapterIn<Def,A>>[]): Promise<UpdateData<AdapterOut<Def,A>>[]>;
  /** Run adapters on any data array 
   * @param dataArray - Array of Data to adapt
   * @param adapterType - Member of adapterTypes enum
   * @returns Adapted data array
   */
  adaptData<A extends AdapterType>(adapterType: A, dataArray: AdapterData<AdapterIn<Def,A>>[]): Promise<AdapterData<AdapterOut<Def,A>>[]>;

  adaptData<A extends AdapterType>
    (adapterType: A, data: AdapterData<AdapterIn<Def,A>> | AdapterData<AdapterIn<Def,A>>[]):
    Promise<AdapterData<AdapterOut<Def,A>>> | Promise<AdapterData<AdapterOut<Def,A>>[]>
  {
    if (!Array.isArray(data)) return runAdapters(adapterType, data, this)

    return Promise.all(data.map((entry) => this.adaptData(adapterType, entry)))
  }
}

export type GenericModel = Model<GenericDefinitionSchema, string>