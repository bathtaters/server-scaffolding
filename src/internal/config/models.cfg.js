module.exports = {
  defaultPrimary: 'id',
  defaultPrimaryType: { typeStr: 'int', type: 'int', isOptional: false, isArray: false },

  adapterKey: { get: 'getAdapter', set: 'setAdapter' },

  ifExistsBehavior: {
    // Goes between "INSERT" & " INTO"
    default: '',
    abort: '',
    skip: ' OR IGNORE',
    overwrite: ' OR REPLACE',
  },
}