import type { ValidationBasic, ValidationExpanded } from "../types/validate.d"

export const
  defaultPrimary = 'id',
  defaultPrimaryType: ValidationBasic & ValidationExpanded = { type: 'int', typeBase: 'int', isOptional: false, isArray: false },
  SQL_ID = 'rowid',

  ifExistsBehavior = {
    // INSERT ... INTO
    default: '',
    abort: '',
    skip: ' OR IGNORE',
    overwrite: ' OR REPLACE',
  },
  
  getChildName = (mainTable: string, arrayKey: string | number | symbol) => `[${mainTable}.${String(arrayKey)}]`,
  getChildPath = (arrayName: string) => arrayName.replace(/^\[|\]$/g,'').replace('.','/'),
  CONCAT_DELIM = '~|~',

  debugSQL = false