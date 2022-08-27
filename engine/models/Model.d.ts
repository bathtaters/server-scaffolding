export type IfExistsBehavior = "default"|"overwrite"|"skip"|"abort"

interface Limits {
  min?:   number,
  max?:   number,
  elem?:  { min?: number, max?: number },
  array?: { min?: number, max?: number }
}

export type Adapter = (value: any, data: object) => Promise<any> | any
export type ChangeCallback<Schema extends object> = (update: Partial<Schema>, current: Schema) => Promise<Schema | void> | Schema | void

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
  isBitmap?:    boolean
}

export interface Feedback { success: boolean }