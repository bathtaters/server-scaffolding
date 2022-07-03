const { extractId, appendAndSort, sanitizeSchemaData, schemaFromConfig } = require('../../utils/db.utils')

jest.mock('../../utils/validate.utils', () => ({ getTypeArray: (type) => [type, type] }))
jest.mock('../../../config/models.cfg', () => ({ types: {
  test1: { a: 'string', b: 'int', c: 'object' },
  test2: { d: 'float',  e: 'boolean' },
}}))
const configSchema = {
  test1: { a: 'TEXT', b: 'INTEGER', c: 'TEXT' },
  test2: { d: 'REAL',  e: 'INTEGER' },
}

describe('extractId', () => {
  it('returns ID', () => {
    expect(extractId({ a: 1, b: 2 }, 'a')[0]).toBe(1)
    expect(extractId({ a: 1, b: 2 }, 'b')[0]).toBe(2)
  })
  it('returns data without ID', () => {
    expect(extractId({ a: 1, b: 2 }, 'a')[1]).toEqual({ b: 2 })
    expect(extractId({ a: 1, b: 2 }, 'b')[1]).toEqual({ a: 1 })
  })
})

describe('appendAndSort', () => {
  it('appends missing value', () => {
    expect(appendAndSort([1,2,3], 4).filter((n) => n === 4).length).toEqual(1)
  })
  it('doesn\'t add missing value', () => {
    expect(appendAndSort([1,2,3], 3).filter((n) => n === 3).length).toEqual(1)
  })
  it('sorts in numerical order', () => {
    expect(appendAndSort([82,4,-678,135,-12,])).toEqual([-678,-12,4,82,135])
    expect(appendAndSort([82,4,-12,], 13)).toEqual([-12,4,13,82])
  })
})

describe('sanitizeSchemaData', () => {
  it('passes all if no schema', () => {
    expect(sanitizeSchemaData({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
  })
  it('passes props in schema', () => {
    expect(sanitizeSchemaData({ a: 1, b: 2 }, { a: 3, b: 4, c: 5 })).toEqual({ a: 1, b: 2 })
  })
  it('filters props not in schema', () => {
    expect(sanitizeSchemaData({ a: 1, b: 2, c: 3 }, { a: 4, b: 5 })).toEqual({ a: 1, b: 2 })
  })
})

describe('schemaFromConfig', () => {
  it('fails if modelName not in config', () => {
    expect(schemaFromConfig('test3')).toBeUndefined()
    expect(schemaFromConfig('test4')).toBeUndefined()
  })
  it('converts types', () => {
    expect(schemaFromConfig('test1')).toEqual(configSchema.test1)
    expect(schemaFromConfig('test2')).toEqual(configSchema.test2)
  })
  it('flags primaryKey', () => {
    expect(schemaFromConfig('test1','a').a).toContain('PRIMARY KEY')
    expect(schemaFromConfig('test2','e').e).toContain('PRIMARY KEY')
    Object.values(schemaFromConfig('test1')).forEach((type) => {
      expect(type).not.toContain('PRIMARY KEY')
    })
  })
})