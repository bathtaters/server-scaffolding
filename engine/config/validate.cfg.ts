import type { TypeDef, Limit } from '../types/validate.d'
import type { TypeOf } from '../types/global.d'
import { nullColumn } from '../types/db'
import RegEx from '../libs/regex'
import { isIn } from '../utils/common.utils'

const strictDatetime = true // Use strict date/time parsing

export const defaultLimits: Partial<Record<TypeDef, Limit>> = {
  int:  { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
  string: { min: 0, max: 2**30-2 },
  array: { min: 0, max: 2**32-2 },
}


export const
  ignoreDisableMin: TypeDef[] = ['float'], // never remove 'min' for these types (intended for helping searches)

  boolOptions = {
    true:  [true,  1, '1', 'true', 'yes',  'on'],
    false: [false, 0, '0', 'false', 'no', 'off', ''],
    types: ['string', 'number', 'boolean'] as TypeOf[],
    loose: true, // case-insensitive & convert using Boolean() [false: anything not in 'false' => true]
  } as const,

  dateOptions = {
    date: { format: 'YYYY-MM-DD', strict: strictDatetime, delimiters: ['-'] },
    time: { strict: strictDatetime, strictSeparator: strictDatetime },
  },

  illegalKeyName = RegEx(/[^a-zA-Z0-9_]/), // match illegal characters for KEY names

  errorMsgs = {
    // Static
    exists:   () => 'must be included',
    invalid: (type?: TypeDef) => {
      if (!type || type === 'any') return 'not valid'

      const typeDict = {
        b64:      'base64 string',
        b64url:   'url-safe base64 string',
        uuid:     'UUID',
        hex:      'hexadecimal',
        float:    'decimal number',
        int:      'integer',
        datetime: 'timestamp',
      }
      return `not a valid ${isIn(type, typeDict) ? typeDict[type] : type}`
    },

    // Variable
    type:      (type: string)               => `does not exist as ${type}`,
    missing:   (key: string, type?: string) => `${key} has ${type ? 'invalid' : 'missing'} type definition: ${type || ''}`,
    missingIn: (key: string)                 => `${key} missing 'in' array for validation`,
    limit:     ({ min, max }: Limit = {}, type?: TypeDef) => {
      const typeSuffix: Partial<Record<TypeDef,string>> = { string: ' characters', array: ' items' }
      const suffix = typeSuffix[type ?? 'any'] ?? ''
      
      let msg = 'must be '
      if (type) {
        msg += `a${['a','e','i','o','u'].includes(type.charAt(0)) ? 'n' : ''} ${type} `

        if (type in defaultLimits && max === defaultLimits[type]?.max && min === defaultLimits[type]?.min) {
          msg += 'within default limits'
          if (suffix) msg += ` for${suffix}`
          return msg
        }  
      }

      if (suffix) msg += 'with '
      msg += max == null ? `${suffix ? '' : 'of '}at least ${min}` :
             min == null ? `${suffix ? '' : 'of '}at most ${max}` :
                           `between ${min} & ${max}`
      return msg + suffix
    },
  },

  illegalKeys = [
    nullColumn,
    "ADD", "EXTERNAL", "PROCEDURE", "ALL", "FETCH", "PUBLIC", "ALTER", "FILE", "RAISERROR", "AND", "FILLFACTOR", "READ", "ANY", "FOR", "READTEXT", "AS", "FOREIGN",
    "RECONFIGURE", "ASC", "FREETEXT", "REFERENCES", "AUTHORIZATION", "FREETEXTTABLE", "REPLICATION", "BACKUP", "FROM", "RESTORE", "BEGIN", "FULL", "RESTRICT", "BETWEEN",
    "FUNCTION", "RETURN", "BREAK", "GOTO", "REVERT", "BROWSE", "GRANT", "REVOKE", "BULK", "GROUP", "RIGHT", "BY", "HAVING", "ROLLBACK", "CASCADE", "HOLDLOCK", "ROWCOUNT",
    "CASE", "IDENTITY", "ROWGUIDCOL", "CHECK", "IDENTITY_INSERT", "RULE", "CHECKPOINT", "IDENTITYCOL", "SAVE", "CLOSE", "IF", "SCHEMA", "CLUSTERED", "IN", "SECURITYAUDIT",
    "COALESCE", "INDEX", "SELECT", "COLLATE", "INNER", "SEMANTICKEYPHRASETABLE", "COLUMN", "INSERT", "SEMANTICSIMILARITYDETAILSTABLE", "COMMIT", "INTERSECT",
    "SEMANTICSIMILARITYTABLE", "COMPUTE", "INTO", "SESSION_USER", "CONSTRAINT", "IS", "SET", "CONTAINS", "JOIN", "SETUSER", "CONTAINSTABLE", "KEY", "SHUTDOWN", "CONTINUE",
    "KILL", "SOME", "CONVERT", "LEFT", "STATISTICS", "CREATE", "LIKE", "SYSTEM_USER", "CROSS", "LINENO", "TABLE", "CURRENT", "LOAD", "TABLESAMPLE", "CURRENT_DATE", "MERGE",
    "TEXTSIZE", "CURRENT_TIME", "NATIONAL", "THEN", "CURRENT_TIMESTAMP", "NOCHECK", "TO", "CURRENT_USER", "NONCLUSTERED", "TOP", "CURSOR", "NOT", "TRAN", "DATABASE", "NULL",
    "TRANSACTION", "DBCC", "NULLIF", "TRIGGER", "DEALLOCATE", "OF", "TRUNCATE", "DECLARE", "OFF", "TRY_CONVERT", "DEFAULT", "OFFSETS", "TSEQUAL", "DELETE", "ON", "UNION",
    "DENY", "OPEN", "UNIQUE", "DESC", "OPENDATASOURCE", "UNPIVOT", "DISK", "OPENQUERY", "UPDATE", "DISTINCT", "OPENROWSET", "UPDATETEXT", "DISTRIBUTED", "OPENXML", "USE",
    "DOUBLE", "OPTION", "USER", "DROP", "OR", "VALUES", "DUMP", "ORDER", "VARYING", "ELSE", "OUTER", "VIEW", "END", "OVER", "WAITFOR", "ERRLVL", "PERCENT", "WHEN", "ESCAPE",
    "PIVOT", "WHERE", "EXCEPT", "PLAN", "WHILE", "EXEC", "PRECISION", "WITH", "EXECUTE", "PRIMARY", "WITHIN GROUP", "EXISTS", "PRINT", "WRITETEXT", "EXIT", "PROC"
  ]