import type { Definition } from "../types/Model.d"

export const
  defaultPrimary = 'id',
  defaultPrimaryType: Definition = { typeStr: 'int', type: 'int', isOptional: false, isArray: false },
  SQL_ID = 'rowid',

  ifExistsBehavior = {
    // INSERT ... INTO
    default: '',
    abort: '',
    skip: ' OR IGNORE',
    overwrite: ' OR REPLACE',
  },
  
  getArrayName = (mainTable: string, arrayKey: string | number) => `[${mainTable}:${arrayKey}]`,
  getArrayPath = (arrayName: string) => arrayName.replace(/^\[|\]$/g,'').replace(':','/'),
  CONCAT_DELIM = '~|~',

  debugSQL = false