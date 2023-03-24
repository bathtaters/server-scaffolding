import type { HTMLType } from './gui.d'
import type { ModelType, Limits} from './validate.d'
import type { SQLType, ForeignKeyAction } from './db.d'

export interface Definition {
  typeStr:     `${ModelType | "string*"}${"" | "?" | "[]" | "[]?"}`,
  limits?:      Limits,
  default?:     any,
  isPrimary?:   boolean,
  getAdapter?:  Adapter,
  setAdapter?:  Adapter,
  html?:        false | string[] | number | HTMLType,
  db?:          false | SQLType,
  dbOnly?:      boolean,

  type?:        ModelType,
  isOptional?:  boolean,
  isArray?:     boolean,
  hasSpaces?:   boolean,
  isBitmap?:    boolean,
  isHTML?:      boolean,
}

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
export type Adapter = (value: any, data: object) => Promise<any> | any

export type ChangeCallback<Schema extends SchemaBase> =
  (update: Partial<Schema>, matching: Schema[]) => Promise<Schema | void> | Schema | void
