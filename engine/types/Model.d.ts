import type { adapterTypes, arrayLabel } from './Model'
import type { HTMLType } from './gui.d'
import type { ValidationTypeFull } from './validate.d'
import type { SQLTypeFull, ForeignKeyAction } from './db.d'

// TODO -- Organize into namespaces
// TODO -- Ability to derive 'Schema'/'DBSchema' from Model.SchemaDefinition

/** Definitions for a column of the Model */
export type Definition<
  Schema extends SchemaBase = SchemaBase,
  DBSchema extends SchemaBase = Schema,
  K extends keyof Schema | keyof DBSchema = keyof Schema & keyof DBSchema,
> = ValidationTypeFull & {

  /** Default value
   *   - Default value to use for that column if nothing provided on creation 
   *   - This value is run through setAdapter each time */
  default?:     K extends keyof Schema ? Schema[K] : K extends keyof DBSchema ? DBSchema[K] : never,

  /** if column is SQL primary key
   *   - When no type/typeStr is provided,
   *     it will be set as auto-incrementing Int */
  isPrimary?:   K extends keyof (Schema | DBSchema) ? boolean : false,
  
  /** Function called whenever this column is retrieved from the database
   *   - false = skip automatic conversions
   *   - PARAMS: (Column value from database, Entire row as an object)
   *   - RETURN: Updated column value for user
   *   - default: Converts data based on type */
  [adapterTypes.get]?: K extends keyof DBSchema ? Adapter<K, DBSchema, Schema> | false : false,

  /** Function called whenever this column is stored in the database (ie. add/update : false)
   *   - false = skip automatic conversions
   *   - PARAMS: (Column value from user, Entire row as an object)
   *   - RETURN: Updated column value for database
   *   - default: Converts data based on type */
  [adapterTypes.set]?: K extends keyof Schema  ? Adapter<K, Schema, DBSchema> | false : false,

  /** Determines HTML generated for this column in GUI form
   *   - string = <input> w/ this as 'type' attribute
   *   - number = <textarea> w/ this as 'rows' attribute
   *   - string[] = <option>/<select> tags with this as list options
   *   - false = column is omitted from GUI form (For database-only types)
   *   - default: auto-generated based on type */
  html?:        false | string[] | number | HTMLType,

  /** Type of schema for this column in database
   *   - false = column is not in database (Only for UI validation)
   *   - default: schema is auto-generated based on type */
  db?:          false | SQLTypeFull,
  
  /** If column is internal to database only
   *   - true = obscure column from non-raw get results 
   *   - default: false */
  dbOnly?:      boolean,

  /** If this column is a BitMap (Binary data stored as an integer)
   *   - default: false */
  isBitmap?:    boolean,

  /** If the data in a string column represents HTML code
   *   - default: false */
  isHTML?:      boolean,
}

// TODO: Generate TS Types from Definition ie. Def['type'] extends 'string' ? string : ... : never
// TODO: Auto-extract Array Keys from DefinitionSchema (Def['isArray'] extends true && Def['db'] extends false | undefined])

export type SchemaBase = Record<string, any>
export type DefinitionSchema<Schema extends SchemaBase, DBSchema extends SchemaBase = Schema> =
  { [K in keyof (Schema & DBSchema) & string]-?: Definition<Schema, DBSchema, K> }
  
export type CommonDefinition<Schema extends SchemaBase, DBSchema extends SchemaBase = Schema> =
  DefinitionSchema<Schema, DBSchema>[keyof Schema & keyof DBSchema & string]

export type SQLSchema = Record<string, Record<string, SQLTypeFull|false|undefined>>

export type Defaults<Schema extends SchemaBase, DBSchema extends SchemaBase> = Partial<{
  [K in keyof (Schema & DBSchema) & string]:
    K extends keyof Schema ? Schema[K] :
    K extends keyof DBSchema ? DBSchema[K] : never
}>

export type Feedback = { success: boolean }

export type ChangeCallback<DBSchema extends SchemaBase> =
  (update: Partial<DBSchema>, matching: DBSchema[]) => Promise<Partial<DBSchema> | void> | Partial<DBSchema> | void

/** { partialMatch?: boolean, orderKey?: keyof Schema & string, onChange?: ChangeCallback<Schema> } */
export type SQLOptions<Schema extends SchemaBase> = {
  /** True = Fuzzy match input data */
  partialMatch?: boolean,
  /** (getter only) Order results by this key */
  orderKey?: keyof Schema & string,
  /** (update only) Called with newData & oldData before updating DB */
  onChange?: ChangeCallback<Schema>
}

export namespace Page {
  type Location = { page?: number, size?: number }
  type Options = { defaultSize?: number, startPage?: number, sizeList?: number[] }
  type Data<Schema> = { data: Schema[], page: number, pageCount: number, size: number, sizes?: number[] }
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

export type ArrayDefinition<Value = any, Key = any> = {
  [arrayLabel.foreignId]: Key,
  [arrayLabel.index]:     number,
  [arrayLabel.value]:     Value
}

export type ArrayDefinitions<Schema extends SchemaBase> = Partial<{ [arrayName in keyof Schema]: DefinitionSchema<ArrayDefinition> }>
export type CreateTableRefs = { [arrayName: string]: ForeignKeyRef }


/**
 * Callback that takes in a single piece of data and returns a modified version of that data
 * @param value - original value
 * @param data - full object that value comes from
 * @returns adapted value
 */
export type Adapter<Key extends keyof SchemaIn, SchemaIn extends SchemaBase, SchemaOut extends SchemaBase = SchemaIn> =
  (value: SchemaIn[Key] | undefined, data: Partial<SchemaIn & SchemaOut>) =>
    Key extends keyof SchemaOut ?
      Promise<SchemaOut[Key] | undefined | void> | SchemaOut[Key] | undefined | void :
      Promise<undefined | void> | undefined | void


export type AdapterType = typeof adapterTypes[keyof typeof adapterTypes]
