export const
  defaultPrimaryKey = 'id',
  defaultPrimaryType /*: ValidationBase */ = 'int',
  SQL_ID = 'rowid',

  ifExistsBehavior = {
    // INSERT ... INTO
    default: '',
    abort: '',
    skip: ' OR IGNORE',
    overwrite: ' OR REPLACE',
  },

  MASK_STR = '[MASKED]',
  
  getChildName = <P extends string, C extends string>(parentName: P, childKey: C): `[${P}.${C}]` => `[${parentName}.${childKey}]`,
  getChildPath = (childName: string) => childName.replace(/^\[|\]$/g,'').replace('.','/'),
  CONCAT_DELIM = '~|~',

  debugSQL = false