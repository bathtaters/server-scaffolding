const { extractId, appendAndSort, sanitizeSchemaData, boolsFromTypes, schemaFromTypes } = require('../../utils/db.utils')

jest.mock('../../utils/validate.utils', () => ({ getTypeArray: (type) => ({ type }) }))
const testTypes = {
  test1: { a: 'string', b: 'int', c: 'object' },
  test2: { d: 'float',  e: 'boolean' },
  test3: { f: 'string',  g: 'boolean', h: 'int', i: 'boolean' },
}
const testSchema = {
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
    expect(appendAndSort([1,2,3], 4).filter((n) => n === 4)).toHaveLength(1)
  })
  it('doesn\'t add missing value', () => {
    expect(appendAndSort([1,2,3], 3).filter((n) => n === 3)).toHaveLength(1)
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

describe('boolsFromTypes', () => {
  it('builds list of all booleans in object', () => {
    expect(boolsFromTypes(testTypes.test2)).toEqual(['e'])
    expect(boolsFromTypes(testTypes.test3)).toEqual(['g','i'])
  })
  it('always returns array', () => {
    expect(boolsFromTypes(testTypes.test1)).toEqual([])
    expect(boolsFromTypes(testTypes.other)).toEqual([])
    expect(boolsFromTypes(1)).toEqual([])
  })
})

describe('schemaFromTypes', () => {
  it('converts types', () => {
    expect(schemaFromTypes(testTypes.test1)).toEqual(testSchema.test1)
    expect(schemaFromTypes(testTypes.test2)).toEqual(testSchema.test2)
  })
  it('flags primaryKey', () => {
    expect(schemaFromTypes(testTypes.test1,'a').a).toContain('PRIMARY KEY')
    expect(schemaFromTypes(testTypes.test2,'e').e).toContain('PRIMARY KEY')
    Object.values(schemaFromTypes('test1')).forEach((type) => {
      expect(type).not.toContain('PRIMARY KEY')
    })
  })
  it('Always returns an object (even w/ null/empty input)', () => {
    expect(schemaFromTypes(testTypes.test1,'a')).toEqual(expect.any(Object))
    expect(schemaFromTypes(testTypes.test2)).toEqual(expect.any(Object))
    expect(schemaFromTypes({})).toEqual({})
    expect(schemaFromTypes(null)).toEqual({})
    expect(schemaFromTypes()).toEqual({})
  })
})