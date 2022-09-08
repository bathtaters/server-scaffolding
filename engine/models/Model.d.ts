export type IfExistsBehavior = "default"|"overwrite"|"skip"|"abort"

interface Limits {
  min?:   number,
  max?:   number,
  elem?:  { min?: number, max?: number },
  array?: { min?: number, max?: number }
}

export interface ArrayDefinition<Value = any, Key = any> {
  fid: Key,
  idx: number,
  val: Value
}

declare type ForeignKeyAction = "NO ACTION" | "RESTRICT" | "SET NULL" | "SET DEFAULT" | "CASCADE"
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
export interface CreateTableRefs { [table: string]: ForeignKeyRef }

export type Adapter = (value: any, data: object) => Promise<any> | any
export type ChangeCallback<Schema extends object> = (update: Partial<Schema>, matching: Schema[]) => Promise<Schema | void> | Schema | void

export interface Definition {
  typeStr:      
    "string"|"uuid"|"b64"|"b64url"|"hex"|"date"|"datetime"|"boolean"|"int"|"float"|"object"|"any"|
    "string?"|"uuid?"|"b64?"|"b64url?"|"hex?"|"date?"|"datetime?"|"boolean?"|"int?"|"float?"|"object?"|"any?"|
    "string[]"|"uuid[]"|"b64[]"|"b64url[]"|"hex[]"|"date[]"|"datetime[]"|"boolean[]"|"int[]"|"float[]"|"object[]"|"any[]"|
    "string[]?"|"uuid[]?"|"b64[]?"|"b64url[]?"|"hex[]?"|"date[]?"|"datetime[]?"|"boolean[]?"|"int[]?"|"float[]?"|"object[]?"|"any[]?"|
    "string*"|"string*?"|"string*[]"|"string*[]?",
  limits?:      Limits,
  default?:     any,
  isPrimary?:   boolean,
  getAdapter?:  Adapter,
  setAdapter?:  Adapter,
  html?:        string[]|number|"id"|"readonly"|
    "button"|"checkbox"|"color"|"date"|"datetime-local"|"email"|"file"|"hidden"|"image"|"month"|"number"|
    "password"|"radio"|"range"|"reset"|"search"|"submit"|"tel"|"text"|"time"|"url"|"week",
  db?:          "TEXT"|"INTEGER"|"REAL"|"BLOB",
  dbOnly?:      boolean,
  type?:        "string"|"uuid"|"b64"|"b64url"|"hex"|"date"|"datetime"|"boolean"|"int"|"float"|"object"|"any",
  isOptional?:  boolean,
  isArray?:     boolean,
  hasSpaces?:   boolean,
  isBitmap?:    boolean,
  isHTML?:      boolean,
}

export interface Feedback { success: boolean }