import type { Awaitable, Flatten, Merge, OneOrMore } from './global.d'
import type { ExtractHTMLType, FormData, HTMLType, ValidToHTML } from './gui.d'
import type { BaseOfValid, ExtractType, IsArray, IsOptional, ValidationBase, ValidationBasic, ValidationExpanded } from './validate.d'
import type { SQLTypeFull, ForeignKeyAction, UpdateData, WhereData, ExtractDBType, DBIsOptional } from './db.d'
import type { adapterTypes, childIndexType, childLabel } from './Model'
import type { MASK_STR, defaultPrimaryKey, defaultPrimaryType } from '../config/models.cfg'

// TODO -- Each definition has 'dbType' <-> 'baseType' <-> 'htmlType' w/ 4 adapters (toDb [set], fromDb [get], toGui, fromGui)
// TODO -- Improve HTML typing

// TODO -- Add BitMap/BitMapObj(bitmap2d) type as option, remove 'isBitmap'

// TODO -- Allow passing Generator function to Definition.default 

// TODO -- Organize types into namespaces
// TODO -- Add a type "ModelName" that is the name of any model in allModels (Use with ModelAccess)


/** Common properties shared by User & Backend Property Definitions */
type DefinitionBase<T> = {

  /** If property is a BitMap (Binary data stored as an integer)
   *   - default: false */
  isBitmap?: boolean,

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
   *   - false = property is omitted from GUI
   *   - default: auto-generated based on type */
  html: false | number | HTMLType,

  /** Data type for property in database
   *   - string = type line in Create Table
   *   - false = hide column from database (Only for UI validation)
   *   - default: auto-generated based on type */
  db: false | SQLTypeFull,
  
  /** Mask property everywhere except for raw results
   *   - true = only accessible in toDB/fromDB adapters OR findRaw
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

/** Definition for a property of the Model */
export type Definition<S extends DefType = DefType> = OneOrMore<
  { type: S, limits?: ValidationBasic['limits'] }
    & Partial<DefinitionBase<ExtractType<S>>>,
  'type'|'isPrimary'
>

/** Normalized definition for a property of the Model */
export type DefinitionNormal<S extends DefType = DefType> = ValidationExpanded & DefinitionBase<ExtractType<S>>

/** Generic Model Schema as { key: Definition } */
export type DefinitionSchema = Record<string, Definition>

/** Model Schema normalized for storage in model */
export type DefinitionSchemaNormal<Def extends DefinitionSchema = DefinitionSchema> = {
  [K in keyof Def & string]: DefinitionNormal<GetDefType<Def[K]>>
}

/** Definition Schema to force a generic Model Definition  */
export type GenericDefinitionSchema = Record<string, ValidationBasic>
  & { [id: string]: ValidationBasic & { isPrimary: true } } // Forces 'primaryID' type to be string

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


/** Generic Type for Definition.type */
export type DefType = ValidationBasic['type']

/** Generic Type for the result of [DB|HTML]SchemaOf<> */
export type SchemaGeneric = Record<string, any>

/** Generic return type for non-returning database operations */
export type Feedback = { success: boolean }

/** Function called before update is sent to database */
export type ChangeCallback<Def extends DefinitionSchema> =
  (update: UpdateData<DBSchemaOf<Def>>, matching: DBSchemaOf<Def>[]) =>
    Awaitable<UpdateData<DBSchemaOf<Def>> | void>

/** { orderKey?: keyof Schema, onChange?: ChangeCallback<Schema>, raw?: bool, skipChildren?: bool } */
export type SQLOptions<Def extends DefinitionSchema> = {
  /** (getter only) Order results by this key */
  orderKey?: DBSchemaKeys<Def>,
  /** (update only) Called with newData & oldData before updating DB */
  onChange?: ChangeCallback<Def>,
  /** (getter only) Skip fromDbAdapters, returning raw DB values */
  raw?: boolean,
  /** (getter only) Skip DB Joins, returned value will not include children from related tables */
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
        O['raw'] extends true  ? DBSchemaOf<Def> : SchemaOf<Def>
      >
      :
        O['raw'] extends true  ? DBSchemaOf<Def> :  SchemaOf<Def>
  >>

/** Result of "_Select" operation */
export type SelectResult<
  Def extends DefinitionSchema,
  O extends SQLOptions<Def>,
> =
  Promise<Array<
    O['skipChildren'] extends true
      ? SkipChildren<DBSchemaOf<Def>>
      : DBSchemaOf<Def>
  >>


/** PageData Types */
export namespace Page {
  type Location = { page?: number, size?: number }
  type Options = { defaultSize?: number, startPage?: number, sizeList?: number[] }
  type Data<Def extends DefinitionSchema> = { data: ViewSchemaOf<Def>[], page: number, pageCount: number, size: number, sizes?: number[] }
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
type ChildTypes<Def extends DefinitionSchema, ChildKey extends keyof Def> = {
  [childLabel.foreignId]: GetDefType<Def[PrimaryIDOf<Def>]>,
  [childLabel.index]:     typeof childIndexType,
  [childLabel.value]:     BaseOfValid<GetDefType<Def[ChildKey]>>
}

/** Extract definitions of child models */
export type ChildDefinitions<Def extends DefinitionSchema> = Partial<{
  [Arr in ChildKey<Def>]: {
    [K in keyof ChildTypes<Def,Arr>]: Definition<ChildTypes<Def,Arr>[K]>
  }
}>

/** Definition for creating child tables */
export type CreateTableRefs = { [childName: string]: ForeignKeyRef }

/** Extract Child Keys */
export type ChildKey<Def extends DefinitionSchema> = keyof OnlyChildren<SchemaOf<Def>> & string
export type OnlyChildren<S extends SchemaGeneric> = { [K in keyof S as S[K] extends any[] ? K : never]: S[K] }
export type SkipChildren<S extends SchemaGeneric> = { [K in keyof S as S[K] extends any[] ? never : K]: S[K] }


/**
 * Callback that takes in a single piece of data and returns a modified version of that data
 * @param value - Value to adapt from input
 * @param data - Full object containing value (Data will be in the middle of being adapted)
 * @returns Adapted value or nothing (Can update object directly)
 */
export type Adapter<Key extends keyof SchemaIn, SchemaIn extends SchemaGeneric, SchemaOut extends SchemaGeneric> =
  (value: SchemaIn[Key] | undefined, data: Partial<Merge<SchemaIn, SchemaOut>>) => Awaitable<
    (Key extends keyof SchemaOut ? SchemaOut[Key] : never) | undefined | void
  >

/** Values from adapterTypes enum */
export type AdapterType = typeof adapterTypes[keyof typeof adapterTypes]


/** Wrapper for a Schema representing all types of data an Adapter can accept/return */
export type AdapterData<S extends SchemaGeneric> = S | Partial<S> | WhereData<S> | UpdateData<S>

/** Extract Adapter SchemaIn for given AdapterType from Definition */
export type AdapterIn<Def extends DefinitionSchema, A extends AdapterType> =
  (A extends typeof adapterTypes['fromDB'] ?   DBSchemaOf<Def> : never) |
  (A extends typeof adapterTypes['toDB']   ?  AddSchemaOf<Def> : never) |
  (A extends typeof adapterTypes['fromUI'] ? FormSchemaOf<Def> : never) |
  (A extends typeof adapterTypes['toUI']   ?     SchemaOf<Def> : never)

/** Extract Adapter SchemaOut for given AdapterType from Definition */
export type AdapterOut<Def extends DefinitionSchema, A extends AdapterType> =
  (A extends typeof adapterTypes['fromDB'] ?     SchemaOf<Def> : never) |
  (A extends typeof adapterTypes['toDB']   ?   DBSchemaOf<Def> : never) |
  (A extends typeof adapterTypes['fromUI'] ?     SchemaOf<Def> : never) |
  (A extends typeof adapterTypes['toUI']   ? ViewSchemaOf<Def> : never)


/** Extract the value of an Adapter's SchemaIn object for given AdapterType from Definition */
export type AdapterInValue<Def extends DefinitionSchema, A extends AdapterType = AdapterType> =
  AdapterIn<Def,A>[keyof AdapterIn<Def,A>]


/** Default Adapter Dictionary { AdapterType: { BaseType?: AdapterFunction } } */
export type DefaultAdapters = { [A in AdapterType]: Partial<Record<ValidationBase, Adapter<any,any,any>>> }

/** Default Array Adapter Dictionary { AdapterType: (EntryAdapter) => ArrayAdapter } */
export type DefaultArrayAdapters = { [A in AdapterType]: (entryAdapter?: Adapter<A,any,any>) => Adapter<any,any,any> }



// Extract Types from Definitions

/** Convert Definition Schema to Base Schema */
export type SchemaOf<Def extends DefinitionSchema> = Flatten<
  { -readonly [K in keyof Def as GetOptional<Def[K]> extends true ? never : K] : SBaseType<Def[K],true> } &
  { -readonly [K in keyof Def as GetOptional<Def[K]> extends true ? K : never]?: SBaseType<Def[K],true> } &
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
  { -readonly [K in keyof Def as HasDefault<Def[K]> extends true ? K : never]?: SBaseType<Def[K]> }

/** Convert Definition Schema to DB Schema */
export type DBSchemaOf<Def extends DefinitionSchema> = Flatten<
  { -readonly [K in keyof Def as GetOptionalDB<Def[K]> extends true ? never : K] : SDBType<Def[K]> } &
  { -readonly [K in keyof Def as GetOptionalDB<Def[K]> extends true ? K : never]?: SDBType<Def[K]> } &
  (GetPrimaryID<Def> extends never ? { [defaultPrimaryKey]: ExtractType<typeof defaultPrimaryType> } : {})
>

// TODO -- Only add 'null' when property is optional
/** Convert Definition Schema to GUI View Schema (Allows passing additional data via the _meta prop) */
export type ViewSchemaOf<Def extends DefinitionSchema> = Partial<{
  -readonly [K in keyof Def as IsInView<Def[K]> extends true ? K : never]:
    SHTMLType<Def[K]> | null
} & { _meta: any }>

/** Convert Definition Schema to GUI Form Schema */
export type FormSchemaOf<Def extends DefinitionSchema> = Partial<{
  -readonly [K in keyof Def as IsInForm<Def[K]> extends true ? K : never]:
    SHTMLType<Def[K]> | null
} & FormData<DBSchemaOf<Def>>>

/** Convert Definition Schema to Base Schema Keys */
export type SchemaKeys<Def extends DefinitionSchema> = keyof SchemaOf<Def> & string

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
export type IDOf<Def extends DefinitionSchema> = keyof (SchemaOf<Def> | DBSchemaOf<Def>) & string

/** Get name of PrimaryID from Definition Schema */
export type PrimaryIDOf<Def extends DefinitionSchema> =
  GetPrimaryID<Def> extends never
    ? typeof defaultPrimaryKey & string
    : GetPrimaryID<Def>

/** Get type of 'id' input based off of 'idKey' for definition Schema */
export type TypeOfID<Def extends DefinitionSchema, ID extends IDOf<Def> | undefined = undefined> =
  SchemaOf<Def>[
    ID extends IDOf<Def> ? ID :
    PrimaryIDOf<Def> extends keyof SchemaOf<Def> ? PrimaryIDOf<Def> :
      keyof SchemaOf<Def>
  ]


// Extract Type HELPERS

/** Extract Base Type from Definition */
type SBaseType<D extends Definition, Masked extends boolean = true> =
  D['isMasked'] extends true
    ? Masked extends true
      ? typeof MASK_STR
      : ExtractType<GetDefType<D>>
    : ExtractType<GetDefType<D>>

/** Extract DB Type from Definition */
type SDBType<D extends Definition> =
  D['db'] extends string
    ? ExtractDBType<D['db']>
    : D['db'] extends false
      ? never
      : Date extends ExtractType<GetDefType<D>>
        ? Exclude<ExtractType<GetDefType<D>>, Date> | number
        : ExtractType<GetDefType<D>>

/** Extract HTML Type from Definition */
type SHTMLType<D extends Definition> =
  D['html'] extends string | number
    ? ExtractHTMLType<D['html']>
    : D['html'] extends false
      ? never
      : IsArray<D['type']> extends true
        ? ExtractHTMLType<ValidToHTML<'array'>>
        : ExtractHTMLType<ValidToHTML<BaseOfValid<GetDefType<D>>>>


/** TypeString from definition (or default TypeString if definition is empty) */
type GetDefType<D extends Definition> =
  D['type'] extends string ? D['type'] : typeof defaultPrimaryType

/** True/False indicating if definition has a Default value */
type HasDefault<D extends Definition> =
  D extends { default: ExtractType<GetDefType<D>> }
    ? true : false

/** True/False indicating if definition will be visible in GUI */
type IsInView<D extends Definition> =
  D['html'] extends false
    ? false
    : D['db'] extends false
      ? false : true

/** True/False indicating if definition will be editable in GUI */
type IsInForm<D extends Definition> =
  IsInView<D> extends true
    ? D['skipForm'] extends true
      ? false : true
    : false

/** True/False indicating if Base Type is Optional */
type GetOptional<D extends Definition> = IsOptional<D['type']> 

/** True/False indicating if Base Type is Optional (Including types with defaults) */
type GetOptionalAdd<D extends Definition> = GetOptional<D> extends true ? true : HasDefault<D>

/** True/False indicating if DB Type is Optional */
type GetOptionalDB<D extends Definition> =
  D['db'] extends string
    ? DBIsOptional<D['db']> extends true
      ? true
      : false
    : IsOptional<D['type']> extends true
      ? D extends { default: ExtractType<GetDefType<D>> }
        ? false
        : true
      : false

/** Definition key where isPrimary = True */
type GetPrimaryID<Def extends DefinitionSchema> = {
  [K in keyof Def]: Def[K]['isPrimary'] extends true ? K : K extends typeof defaultPrimaryKey ? K : never
}[keyof Def] & string