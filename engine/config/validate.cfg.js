const RegEx = require('../libs/regex')
const strictDatetime = true // Use strict date/time parsing

const defaultLimits = {
  int:  { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER },
  string: { min: 0, max: 2**30-2 },
  array: { min: 0, max: 2**32-2 },
}

module.exports = {
  ignoreDisableMin: ['float'], // never remove 'min' for these types (intended for helping searches)

  boolOptions: {
    true:  [true,  1, '1', 'true', 'yes',  'on'],
    false: [false, 0, '0', 'false', 'no', 'off', ''],
    types: ['string', 'number', 'boolean'],
    loose: true, // case-insensitive & convert using Boolean() [false: anything not in 'false' => true]
  },

  dateOptions: {
    date: { format: 'YYYY-MM-DD', strict: strictDatetime, delimiters: ['-'] },
    time: { strict: strictDatetime, strictSeparator: strictDatetime },
  },

  illegalKeyName: RegEx(/[^a-zA-Z0-9_]/), // match illegal characters for KEY names

  defaultLimits,

  errorMsgs: {
    // Static
    exists:   () => 'must be included',
    b64:      () => 'not a valid base64 string',
    uuid:     () => 'not a valid UUID',
    hex:      () => 'not a valid hexadecimal',
    string:   () => 'not a valid string',
    float:    () => 'not a valid decimal',
    int:      () => 'not a valid number',
    boolean:  () => 'not a valid boolean',
    interval: () => 'not a valid interval',
    datetime: () => 'not a valid timestamp',
    date:     () => 'not a valid date',
    object:   () => 'not a valid object',
    array:    () => 'not a valid array',
    // Variable
    type:      (type)      => `does not exist as ${type}`,
    missing:   (key, type) => `${key} has ${type ? 'invalid' : 'missing'} type definition: ${type || ''}`,
    missingIn: (key)       => `${key} missing 'in' array for validation`,
    limit:     ({ min, max } = {}, type) => 
      `must be ${type ? type+' ' : ''}${
        defaultLimits[type] && max === defaultLimits[type].max && min === defaultLimits[type].min ? 
          `within default limits${type === 'string' || type === 'array' ? ' for' : ''}` :
        min == null || max == null ? `${!max ? 'more' : 'less'} than ${min || max}` :
        `between ${min} & ${max}`
      }${type === 'string' ? ' characters' : type === 'array' ? ' items' : ''}`,
  },

  illegalKeys: [
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
  ],
}