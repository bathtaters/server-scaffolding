import type { Awaitable, Flatten, Merge, Not, OneOrMore, PartialExcept } from './global.d'
import type { ExtractHTMLType, FormData, HTMLType, ValidToHTML } from './gui.d'
import type { BaseOfValid, ExtractType, IsArray, IsOptional, ValidationBase, ValidationBasic, ValidationExpanded, ValidationType } from './validate.d'
import type { SQLTypeFull, ForeignKeyAction, UpdateData, WhereData, ExtractDBType, DBIsOptional, WhereValue, UpdateValue } from './db.d'
import type { ExtendedType, adapterTypes, childIndexType, childLabel, viewMetaKey } from './Model'
import type { typeSuffixes } from './validate'
import type { MASK_STR, defaultPrimaryKey, defaultPrimaryType } from '../config/models.cfg'

// TODO -- Improve HTML typing (Create 'multi-input' type (AKA only takes specific values))

// TODO -- Allow passing Generator function to Definition.default 

// TODO -- Organize types into namespaces

/** Response types to expect from API */
export namespace ApiResponse {
  type Create<Def extends DefinitionSchema = any> = SkipChildren<SchemaOf<Def>,Def>
  type Read  <Def extends DefinitionSchema = any> = SchemaOf<Def> | SchemaOf<Def>[]
  type Update<Def extends DefinitionSchema = any> = Feedback
  type Delete<Def extends DefinitionSchema = any> = Feedback
  type SwapID<Def extends DefinitionSchema = any> = Feedback
}


/** Common properties shared by User & Backend Property Definitions */
type DefinitionBase<T> = {

  /** Default value
   *   - Default value to use if nothing provided on creation
   *   - This value should be the type used in backend services
   *   - default for Primary Key: auto-generated unique ID
   *   - default: NULL (Must be provided if property is not optional or primaryKey) */
  default?: NonNullable<T>,
  
  /** Determines HTML Form type of property
   *   - string = <input> w/ this as 'type' attribute 
   *      (Or <option>/<select> if this = "option")
   *   - number = <textarea> w/ this as 'rows' attribute
   *   - false = property is omitted from UI
   *   - default: auto-generated based on type */
  html: false | number | HTMLType,

  /** Data type for property in database
   *   - string = type line in Create Table
   *   - false = hide column from database (Only for UI validation)
   *   - default: auto-generated based on type */
  db: false | SQLTypeFull,
  
  /** Mask property everywhere except for raw results
   *   - true = only accessible in fromDB adapter OR findRaw
   *            value is masked using [MASKED]
   *   - default: false */
  isMasked?: boolean,

  /** Don't include property in generated forms
   *  (Used when property is created/set by side-effects)
   *   - default: false */
  skipForm?: boolean,

  /** Property is primary key for database
   *   - Type must be string or numeric type
   *   - When no type is provided,
   *     it will be set as auto-incrementing int */
  isPrimary?: NonNullable<T> extends string | number ? boolean : false,
}

/** Class that constructs ExtendedType */
export type ExtendedClass<Raw extends string | number> = new() => ExtendedType<Raw>

/** Definition for a property of the Model
 *   - Type is Validation type OR ExtendType class
 *   - NOTE: Setting adapters will override the class adapters
 *   - default: None */
export type Definition<T extends DefType = DefType> = OneOrMore<
  { type: T, limits?: ValidationBasic['limits'] }
    & Partial<DefinitionBase<T extends ValidationType ? ExtractType<T> : T>>,
  'type'|'isPrimary'
>

/** Normalized definition for a property of the Model */
export type DefinitionNormal<T extends DefType = DefType> = 
  Partial<ValidationExpanded & { typeExtended?: ExtendedClass<any> }>
  & DefinitionBase<T extends ValidationType ? ExtractType<T> : T>

/** Generic Model Schema as { key: Definition } */
export type DefinitionSchema = Record<string, Definition>

/** Model Schema normalized for storage in model */
export type DefinitionSchemaNormal<Def extends DefinitionSchema = DefinitionSchema> = {
  [K in keyof Def & string]: DefinitionNormal<GetType<Def[K]['type']>>
}

/** Definition Schema to force a generic Model Definition  */
export type GenericDefinitionSchema = DefinitionSchema
  & { [id: string]: DefinitionSchema & { isPrimary: true } } // Forces 'primaryID' type to be string

/** Options to override default type adapters */
export type AdapterDefinition<Def extends DefinitionSchema> = {
  /** Transform functions for each property */
  [A in AdapterType]: {
    /** Transform function for adapterType of thisProperty
     *   - function = (Incoming Value, Current State of Object) => Transformed Value
     *   - false = force no transform
     *   - default: auto-generated based on property type */
    [K in keyof AdapterIn<Def,A> & string]?: Adapter<K, AdapterIn<Def,A>, AdapterOut<Def,A>> | false
  }
}

/** Default type adapters w/ looser typing (For internal use) */
export type AdapterDefinitionLoose<Def extends DefinitionSchema = DefinitionSchema> = {
  [A in AdapterType]: { [K in keyof Def]?: Adapter<K, any, any> | false }
}

/** Optional model-wide listener callbacks */
type ModelListeners<Def extends DefinitionSchema> = {
  /** Called whenever an entry is added to the DB
   * @param dataArray - Array of records to be added
   * @returns Promise optionally containing updated data (Can instead mutate the exisiting object) */
  onCreate?: (dataArray: DBSchemaOf<Def>[]) => Awaitable<void | DBSchemaOf<Def>[]>,

  /** Called whenever an DB entry is updated
   * @param updateData   - UpdateData to be applied to matching Database entries
   * @param matchingData - Array of records in database to be updated
   * @returns Promise optionally containing updated UpdateData (Can instead mutate the exisiting object) */
  onUpdate?: (updateData: UpdateData<DBSchemaOf<Def>>, matchingData: DBSchemaOf<Def>[]) => Awaitable<void | UpdateData<DBSchemaOf<Def>>>,

  /** Called whenever an DB entry is deleted
   * @param dataArray - Array of records to be deleted
   * @param whereData - WhereData of data to be deleted
   * @returns Promise optionally containing updated WhereData (Can instead mutate the exisiting object) */
  onDelete?: (dataArray: DBSchemaOf<Def>[], whereData: WhereData<DBSchemaOf<Def>>) => Awaitable<void | WhereData<DBSchemaOf<Def>>>,
}

/** Generic Type for Definition.type */
export type DefType = ValidationType | ExtendedClass<any>

/** Generic Type for the result of [DB|HTML]SchemaOf<> */
export type SchemaGeneric = Record<string, any>

/** Generic return type for non-returning database operations */
export type Feedback = { success: boolean }

/** Function called before update is sent to database */
export type ChangeCallback<Def extends DefinitionSchema> =
  (update: UpdateData<DBSchemaOf<Def>>, matching: DBSchemaOf<Def>[]) =>
    Awaitable<UpdateData<DBSchemaOf<Def>> | void>

/** Options for DB getters: { raw?: bool, skipChildren?: bool } */
export type SQLOptions<Def extends DefinitionSchema> = {
  /** Skip fromDbAdapters, returning raw DB values */
  raw?: boolean,
  /** Skip DB Joins, returned value will not include children from related tables */
  skipChildren?: boolean
}

/** ID Options: { idKey: ID Key from Definition } */
export type IDOption<Def extends DefinitionSchema> = { idKey?: IDOf<Def> }

/** Result of "Find" operation */
export type FindResult<
  Def extends DefinitionSchema,
  O extends SQLOptions<Def>,
> =
  Promise<Array<
    O['skipChildren'] extends true
      ? SkipChildren<
        O['raw'] extends true  ? DBSchemaOf<Def> : SchemaOf<Def,true>,
        Def
      >
      :
        O['raw'] extends true  ? DBSchemaOf<Def> :  SchemaOf<Def,true>
  >>

/** Result of "_Select" operation */
export type SelectResult<
  Def extends DefinitionSchema,
  O extends SQLOptions<Def>,
> =
  Promise<Array<
    O['skipChildren'] extends true
      ? SkipChildren<DBSchemaOf<Def>,Def>
      : DBSchemaOf<Def>
  >>


/** PageData Types */
export namespace Page {
  /** Model-wide Options for Page Data */
  type Options = {
    /** Page Size to default to when one isn't provided */
    defaultSize?: number,
    /** Page Number to default to when one isn't provided */
    startPage?: number,
    /** List of possible Page Sizes */
    sizeList?: number[]
  }

  /** Page Options to Select Data */
  type Select<Def extends DefinitionSchema> = {
    /** Page Number: 1-indexed */
    page: number,
    /** Page Size: Must be at least 1 */
    size: number,
    /** Sort Key: (Optional) Column to order data by */
    sort?: DBSchemaKeys<Def>
    /** Descenending: (Optional) sort in descending(true)/ascending(false) order, default: false */
    desc?: boolean,
  }

  /** Form of Page Data Return */
  type Return<Def extends DefinitionSchema> = {
    /** Data from page in DB, formatted for HTML Display */
    data: ViewSchemaOf<Def>[],
    /** Current page number */
    page: number,
    /** Total number of pages */
    pageCount: number,
    /** Current page size */
    size: number,
    /** All possible page sizes */
    sizes?: number[]
  }
}

/** Object to generate Foreign Key Reference SQL */
export interface ForeignKeyRef {
  /** Name of column in current table */
  key:    string,
  /** Name of foreign table being referenced */
  table:  string,
  /** Name of columnn on foreign table being referenced */
  refKey: string,
  /** Action to take when referenced row on foreign table is deleted  */
  onDelete?: ForeignKeyAction,
  /** Action to take when referenced key on foreign table is updated  */
  onUpdate?: ForeignKeyAction
}

/** Object of { ChildProperties: TypeStrings } */
type ChildTypes<Def extends DefinitionSchema, ChildKey extends keyof Def> = 
  Def[ChildKey]['type'] extends ExtendedClass<any> ? never : {
    [childLabel.foreignId]: DefTypeStr<Def[PrimaryIDOf<Def>]>,
    [childLabel.index]:     typeof childIndexType,
    [childLabel.value]:     BaseOfValid<DefTypeStr<Def[ChildKey]>>
  }

/** Extract definitions of child models */
export type ChildDefinitions<Def extends DefinitionSchema> = Partial<{
  [Arr in ChildKey<Def>]: {
    [K in keyof ChildTypes<Def,Arr>]:
      ChildTypes<Def,Arr>[K] extends ValidationType ? Definition<ChildTypes<Def,Arr>[K]> : never
  }
}>

/** Definition for creating child tables */
export type CreateTableRefs = { [childName: string]: ForeignKeyRef }

/** Extract Child Keys */
export type ChildKey<Def extends DefinitionSchema> = {
  [K in keyof Def]:
    Def[K]['db'] extends SQLTypeFull ? never : 
    Def[K]['type'] extends `${string}${typeof typeSuffixes.isArray}` ? K :
      never
}[keyof Def]
export type SkipChildren<S extends SchemaGeneric, D extends DefinitionSchema> = Omit<S, ChildKey<D>>
export type OnlyChildren<S extends SchemaGeneric, D extends DefinitionSchema> = Omit<S, keyof SkipChildren<S,D>>


/**
 * Callback that takes in a single piece of data and returns a modified version of that data
 * @param value - Value to adapt from input
 * @param outData - In progress output object (Can be directly updated)
 * @param inData - Full input object
 * @returns Adapted value or nothing (Can update object directly)
 */
export type Adapter<Key extends keyof SchemaIn, SchemaIn extends SchemaGeneric, SchemaOut extends SchemaGeneric> =
  ( value: SchemaIn[Key] | undefined,
    inData: { [K in keyof SchemaIn]?: WhereValue<SchemaIn[K]> | UpdateValue<SchemaIn[K]> },
    outData: PartialExcept<Merge<SchemaIn, SchemaOut>, typeof viewMetaKey>,
  ) => Awaitable<
    (Key extends keyof SchemaOut ? SchemaOut[Key] : never) | undefined | void
  >

/** Values from adapterTypes enum */
export type AdapterType = typeof adapterTypes[keyof typeof adapterTypes]


/** Wrapper for a Schema representing all types of data an Adapter can accept/return */
export type AdapterData<S extends SchemaGeneric> = S | Partial<S> | WhereData<S> | UpdateData<S>

/** Extract Adapter SchemaIn for given AdapterType from Definition */
export type AdapterIn<Def extends DefinitionSchema, A extends AdapterType> =
  (A extends typeof adapterTypes['fromDB'] ?     DBSchemaOf<Def> : never) |
  (A extends typeof adapterTypes['toDB']   ? SchemaOf<Def,false> : never) |
  (A extends typeof adapterTypes['fromUI'] ?   FormSchemaOf<Def> : never) |
  (A extends typeof adapterTypes['toUI']   ?  SchemaOf<Def,true> : never)

/** Extract Adapter SchemaOut for given AdapterType from Definition */
export type AdapterOut<Def extends DefinitionSchema, A extends AdapterType> =
  (A extends typeof adapterTypes['fromDB'] ?  SchemaOf<Def,true> : never) |
  (A extends typeof adapterTypes['toDB']   ?     DBSchemaOf<Def> : never) |
  (A extends typeof adapterTypes['fromUI'] ? SchemaOf<Def,false> : never) |
  (A extends typeof adapterTypes['toUI']   ?   ViewSchemaOf<Def> : never)


/** Extract the value of an Adapter's SchemaIn object for given AdapterType from Definition */
export type AdapterInValue<Def extends DefinitionSchema, A extends AdapterType = AdapterType> =
  AdapterIn<Def,A>[keyof AdapterIn<Def,A>]


/** Default Adapter Dictionary { AdapterType: { BaseType?: AdapterFunction } } */
export type DefaultAdapters = { [A in AdapterType]: Partial<Record<ValidationBase, Adapter<any,any,any>>> }

/** Default Array Adapter Dictionary { AdapterType: (EntryAdapter) => ArrayAdapter } */
export type DefaultArrayAdapters = { [A in AdapterType]: (entryAdapter?: Adapter<A,any,any>) => Adapter<any,any,any> }



// Extract Types from Definitions

/** Convert Definition Schema to Base Schema */
export type SchemaOf<Def extends DefinitionSchema, Masked extends boolean = true> = Flatten<
  { -readonly [K in keyof Def as GetOptional<Def[K]> extends true ? never : K] : SBaseType<Def[K],Masked> } &
  { -readonly [K in keyof Def as GetOptional<Def[K]> extends true ? K : never]?: SBaseType<Def[K],Masked> } &
  (GetPrimaryID<Def> extends never ? { [defaultPrimaryKey]: ExtractType<typeof defaultPrimaryType> } : {})
>

/** Convert Definition Schema to Schema for Inserting New Entries  */
export type AddSchemaOf<Def extends DefinitionSchema> = Flatten<
  { -readonly [K in keyof Def as GetOptionalAdd<Def[K]> extends true ? never : K] : SBaseType<Def[K],false> } &
  { -readonly [K in keyof Def as GetOptionalAdd<Def[K]> extends true ? K : never]?: SBaseType<Def[K],false> } &
  (GetPrimaryID<Def> extends never ? { [defaultPrimaryKey]: ExtractType<typeof defaultPrimaryType> } : {})
>

/** Convert Definition Schema to Schema of Default Values */
export type DefaultSchemaOf<Def extends DefinitionSchema> = 
  { -readonly [K in keyof Def as HasDefault<Def[K]> extends true ? K : never]?: SBaseType<Def[K],false> }

/** Convert Definition Schema to DB Schema */
export type DBSchemaOf<Def extends DefinitionSchema> = Flatten<
  { -readonly [K in keyof Def as GetOptionalDB<Def[K]> extends false ? K : never]-?: SDBType<Def[K]> } &
  { -readonly [K in keyof Def as GetOptionalDB<Def[K]> extends true  ? K : never]+?: SDBType<Def[K]> } &
  (GetPrimaryID<Def> extends never ? { [defaultPrimaryKey]: ExtractType<typeof defaultPrimaryType> } : {})
>

/** Convert Definition Schema to GUI View Schema (Allows passing additional data via the viewMetaKey) */
export type ViewSchemaOf<Def extends DefinitionSchema> = {
  -readonly [K in keyof Def as IsInView<Def[K]> extends true ? K : never]:
    SHTMLType<Def[K]> | (undefined extends SHTMLType<Def[K]> ? null : never)
} & { [viewMetaKey]: Record<string,any> }

/** Convert Definition Schema to GUI Form Schema */
export type FormSchemaOf<Def extends DefinitionSchema> = Partial<{
  -readonly [K in keyof Def as IsInForm<Def[K]> extends true ? K : never]:
    SHTMLType<Def[K]> | null
} & FormData<DBSchemaOf<Def>>>

/** Convert Definition Schema to Base Schema Keys */
export type SchemaKeys<Def extends DefinitionSchema> = keyof SchemaOf<Def,boolean> & string

/** Convert Definition Schema to Keys of Schema for Inserting New Entries */
export type AddSchemaKeys<Def extends DefinitionSchema> = keyof AddSchemaOf<Def> & string

/** Convert Definition Schema to Keys of Default Values */
export type DefaultSchemaKeys<Def extends DefinitionSchema> = keyof DefaultSchemaOf<Def> & string

/** Convert Definition Schema to DB Schema Keys */
export type DBSchemaKeys<Def extends DefinitionSchema> = keyof DBSchemaOf<Def> & string

/** Convert Definition Schema to GUI View Schema Keys */
export type ViewSchemaKeys<Def extends DefinitionSchema> = keyof ViewSchemaOf<Def> & string

/** Convert Definition Schema to GUI Form Schema Keys */
export type FormSchemaKeys<Def extends DefinitionSchema> = keyof FormSchemaOf<Def> & string

/** Get a valid ID from  */
export type IDOf<Def extends DefinitionSchema> = keyof (SchemaOf<Def,boolean> | DBSchemaOf<Def>) & string

/** Get name of PrimaryID from Definition Schema */
export type PrimaryIDOf<Def extends DefinitionSchema> =
  GetPrimaryID<Def> extends never
    ? typeof defaultPrimaryKey & string
    : GetPrimaryID<Def>

/** Get type of 'id' input based off of 'idKey' for definition Schema */
export type TypeOfID<Def extends DefinitionSchema, ID extends IDOf<Def> | undefined = undefined> =
  SchemaOf<Def,false>[
    ID extends IDOf<Def> ? ID :
    PrimaryIDOf<Def> extends keyof SchemaOf<Def,false> ? PrimaryIDOf<Def> :
      keyof SchemaOf<Def,false>
  ]


// Extract Type HELPERS

/** Extract Base Type from Definition */
type SBaseType<D extends Definition, Masked extends boolean = true> =
  Masked | D['isMasked'] extends true
    ? typeof MASK_STR
    : D['isPrimary'] extends true
      ? GetType<DefTypeStr<D['type']>>
    : GetType<D['type']>


/** Extract DB Type from Definition */
type SDBType<D extends Definition> =
  D['db'] extends string
    ? ExtractDBType<D['db']>
    : D['db'] extends false
      ? never
      : D['type'] extends ExtendedClass<any>
        ? GetValueType<D['type']>
        : Date extends GetType<D['type']>
          ? Exclude<GetType<D['type']>, Date> | number
          : GetType<D['type']>


/** Extract HTML Type from Definition */
type SHTMLType<D extends Definition> =
  D['html'] extends string | number
    ? ExtractHTMLType<D['html']>
    : D['html'] extends false
      ? never
      : D['type'] extends ValidationType
        ? IsArray<D['type']> extends true
          ? ExtractHTMLType<ValidToHTML<'array'>>
          : ExtractHTMLType<ValidToHTML<BaseOfValid<DefTypeStr<D>>>>
      : D['type'] extends ExtendedClass<any>
        ? ReturnType<InstanceType<D['type']>['toString']>
        : any


/** Get Type from Definition.Type (string/Class) */
type GetType<D extends DefType | undefined> =
  DefType extends D
    ? any
    : D extends ExtendedClass<any>
      ? InstanceType<D>
      : ExtractType<DefTypeStr<D>>

/** Get underlying value type from ExtendedClass */
type GetValueType<C extends ExtendedClass<any>> =
  ReturnType<InstanceType<C>['valueOf']>


/** TypeString from definition (or default TypeString if definition is empty) */
type DefTypeStr<S> = S extends ValidationType ? S : typeof defaultPrimaryType

/** True/False indicating if definition has a Default value */
type HasDefault<D extends Definition> =
  D extends { default: GetType<D['type']> }
    ? true : false

/** True/False indicating if definition will be visible in GUI */
type IsInView<D extends Definition> =
  D['html'] extends false
    ? false
    : D['db'] extends false
      ? false : true

/** True/False indicating if definition will be editable in GUI */
type IsInForm<D extends Definition> =
  D['skipForm'] extends true
    ? false
    : D['html'] extends false ? false : true

/** True/False indicating if Base Type is Optional */
type GetOptional<D extends Definition> = D['type'] extends ValidationType ? IsOptional<D['type']> : true

/** True/False indicating if Base Type is Optional (Including types with defaults) */
type GetOptionalAdd<D extends Definition> = GetOptional<D> extends true ? true : HasDefault<D>

/** True/False indicating if DB Type is Optional (Never indicates Key should not be included at all) */
type GetOptionalDB<D extends Definition> =
  D['db'] extends false
    ? never
    : D['db'] extends string
      ? DBIsOptional<D['db']>
      : GetOptional<D> extends true
        ? Not<HasDefault<D>>
        : false

/** Definition key where isPrimary = True */
type GetPrimaryID<Def extends DefinitionSchema> = {
  [K in keyof Def]: Def[K]['isPrimary'] extends true ? K : K extends typeof defaultPrimaryKey ? K : never
}[keyof Def] & string