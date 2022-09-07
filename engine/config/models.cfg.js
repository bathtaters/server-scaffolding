module.exports = {
  defaultPrimary: 'id',
  defaultPrimaryType: { typeStr: 'int', type: 'int', isOptional: false, isArray: false },
  SQL_ID: 'rowid',

  adapterKey: { get: 'getAdapter', set: 'setAdapter' },

  ifExistsBehavior: {
    // INSERT ... INTO
    default: '',
    abort: '',
    skip: ' OR IGNORE',
    overwrite: ' OR REPLACE',
  },

  arrayLabel: { foreignId: 'fid', index: 'idx', entry: 'val' }, // Note: also update in Models.d.ts
  getArrayName: (mainTable, arrayKey) => `[${mainTable}:${arrayKey}]`,
  getArrayPath: (arrayName) => arrayName.replace(/^\[|\]$/g,'').replace(':','/'),
  CONCAT_DELIM: '~|~',

  debugSQL: false,
}