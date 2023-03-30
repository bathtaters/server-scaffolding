import type { HTMLType } from './gui.d'
import type { ModelType, Limits} from './validate.d'
import type { SQLType, ForeignKeyAction } from './db.d'

/** Definitions for a column of the Model */
export interface Definition {

  /** Column type of form: type*[]? (Everything except 'type' is optional)
  *   - type = string, uuid, b64[url], hex, date, datetime, boolean, int, float, object, any
  *   - [] = array of type
  *   - ? = column is optional
  *   - \* = (Only allowed w/ type = string) allows symbols/spaces in string */
  typeStr:     `${ModelType | "string*"}${"" | "?" | "[]" | "[]?"}`,

  /** Object of column limits
   *   - { min?, max? } | { array: { min?, max? }, elem: { min?, max? } }
   *   - Sets limits on numbers, string length or array size */
  limits?:      Limits,

  /** Default value
   *   - Default value to use for that column if nothing provided on creation 
   *   - This value is run through setAdapter each time */
  default?:     any,

  /** if column is SQL primary key
   *   - When no type/typeStr is provided,
   *     it will be set as auto-incrementing Int */
  isPrimary?:   boolean,
  
  /** Function called whenever this column is retrieved from the database
   *   - PARAMS: (Column value from database, Entire row as an object)
   *   - RETURN: Updated column value for user
   *   - default: Converts data based on type */
  getAdapter?:  Adapter,

  /** Function called whenever this column is stored in the database (ie. add/update)
   *   - PARAMS: (Column value from user, Entire row as an object)
   *   - RETURN: Updated column value for database
   *   - default: Converts data based on type */
  setAdapter?:  Adapter,

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
  db?:          false | SQLType,
  
  /** If column is internal to database only
   *   - true = obscure column from non-raw get results 
   *   - default: false */
  dbOnly?:      boolean,
  

  /** Column base type (w/o *[]? suffixes)
   *   - default: parsed from typeStr */
  type?:        ModelType,

  /** If column can be empty ('?' suffix)
   *   - default: parsed from typeStr */
  isOptional?:  boolean,

  /** If column is an array of <type> ('[]' suffix)
   *   - This will auto-create and link a related table for this column
   *      unless "db" property is present
   *   - default: parsed from typeStr */
  isArray?:     boolean,

  /** If a string column will allow spaces & special characters ('*' suffix)
   *   - default: parsed from typeStr */
  hasSpaces?:   boolean,

  /** If this column is a BitMap (Binary data stored as an integer)
   *   - default: false */
  isBitmap?:    boolean,

  /** If the data in a string column represents HTML code
   *   - default: false */
  isHTML?:      boolean,
}

/** Object to generate Foreign Key Reference SQL */
interface ForeignKeyRef {
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
  fid: Key,
  idx: number,
  val: Value
}

export type SchemaBase = Record<string, any>

export type Feedback = { success: boolean }
export type CreateTableRefs = { [table: string]: ForeignKeyRef }

/**
 * Callback that takes in a single piece of data and returns a modified version of that data
 * @param value - original value
 * @param data - full object that value comes from
 * @returns adapted value
 */
export type Adapter = <In = Any, Out = any, D = Record<string, any>>(value: In, data: D) => Promise<Out> | Out

export type ChangeCallback<Schema extends SchemaBase> =
  (update: Partial<Schema>, matching: Schema[]) => Promise<Schema | void> | Schema | void
