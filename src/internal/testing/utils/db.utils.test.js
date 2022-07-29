const { extractId, appendAndSort, sanitizeSchemaData, boolsFromTypes, schemaFromTypes, adaptersFromTypes } = require('../../utils/db.utils')

const testTypes = {
  test1: { a: 'string', b: 'int', c: 'object', d: 'datetime' },
  test2: { e: 'float',  f: 'boolean' },
}
const testSchema = {
  test1: { a: 'TEXT', b: 'INTEGER', c: 'TEXT', d: 'INTEGER' },
  test2: { e: 'REAL',  f: 'INTEGER' },
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
  const boolTest = { a: 'string',  b: 'boolean', c: 'int', d: 'boolean' }
  it('builds list of all booleans in object', () => {
    expect(boolsFromTypes(testTypes.test2)).toEqual(['f'])
    expect(boolsFromTypes(boolTest)).toEqual(['b','d'])
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

describe('adaptersFromTypes', () => {
  const { getAdapter, setAdapter } = adaptersFromTypes({ b: 'boolean', i: 'int', o: 'object', d: 'datetime', s: 'string' })

  it('returns functions when adapters exist', () => {
    expect(typeof getAdapter).toBe('function')
    expect(typeof setAdapter).toBe('function')
  })
  it('returns falsy when no adapters exist', () => {
    const { getAdapter, setAdapter } = adaptersFromTypes({ a: 'float', b: 'int', c: 'any', d: 'uuid', e: 'string' })
    expect(getAdapter).toBeFalsy()
    expect(setAdapter).toBeFalsy()
  })
  it('passes strings/ints', () => {
    expect(getAdapter({ s: 'nick', i: 12 })).toEqual({ s: 'nick', i: 12 })
    expect(setAdapter({ s: 'nick', i: 12 })).toEqual({ s: 'nick', i: 12 })
    expect(getAdapter({ s: { a: 1, b: 2 }, i: ['TEST'] })).toEqual({ s: { a: 1, b: 2 }, i: ['TEST'] })
    expect(setAdapter({ s: { a: 1, b: 2 }, i: ['TEST'] })).toEqual({ s: { a: 1, b: 2 }, i: ['TEST'] })
  })

  it('sets objects', () => {
    expect(typeof setAdapter({ o: { a: 'test', b: 1 } }).o).toBe('string')
    expect(setAdapter({ o: { a: 'test', b: 1 } }).o).toBe('{"a":"test","b":1}')
    expect(setAdapter({ o: '{"a":"test","b":1}' }).o).toBe('{"a":"test","b":1}')
    expect(setAdapter({ o: [1,'test',2,3] })).toEqual({ o: '[1,"test",2,3]' })
    expect(setAdapter({ o: [1,'test',2,3], s: 'pass' })).toEqual({ o: '[1,"test",2,3]', s: 'pass' })
  })
  it('gets objects', () => {
    expect(typeof getAdapter({ o: '{"a":"test","b":1}' }).o).toBe('object')
    expect(getAdapter({ o: '{"a":"test","b":1}' }).o).toEqual({ a: 'test', b: 1 })
    expect(getAdapter({ o: '[1,"test",2,3]' })).toEqual({ o: [1,'test',2,3] })
    expect(getAdapter({ o: '[1,"test",2,3]', s: 'pass' })).toEqual({ o: [1,'test',2,3], s: 'pass' })
  })

  it('sets dates', () => {
    expect(typeof setAdapter({ d: new Date() }).d).toBe('number')
    expect(setAdapter({ d: new Date(Date.UTC(2021, 10, 7)) }).d).toBe(1636243200000)
    expect(setAdapter({ d: '2006-01-02T00:00:00' }).d).toBe(1136178000000)
    expect(setAdapter({ d: 1236286200000 }).d).toBe(1236286200000)
    expect(setAdapter({ d: new Date(Date.UTC(2020, 6, 14)) })).toEqual({ d: 1594684800000 })
    expect(setAdapter({ d: new Date(Date.UTC(2020, 6, 14)), s: 'pass' })).toEqual({ d: 1594684800000, s: 'pass' })
  })
  it('gets dates', () => {
    expect(typeof getAdapter({ d: '2021-11-07T00:00:00.000Z' }).d.getMonth).toBe('function')
    expect(getAdapter({ d: '2021-11-07T00:00:00.000Z' }).d).toEqual(new Date(Date.UTC(2021, 10, 7)))
    expect(getAdapter({ d: '2020-07-14T00:00:00.000Z' })).toEqual({ d: new Date(Date.UTC(2020, 6, 14)) })
    expect(getAdapter({ d: '2020-07-14T00:00:00.000Z', s: 'pass' })).toEqual({ d: new Date(Date.UTC(2020, 6, 14)), s: 'pass' })
  })

  it('sets booleans', () => {
    expect(typeof setAdapter({ b: 'test' }).b).toBe('number')
    expect(setAdapter({ b: true  }).b).toBe(1)
    expect(setAdapter({ b: false }).b).toBe(0)
    expect(setAdapter({ b: false })).toEqual({ b: 0 })
    expect(setAdapter({ b: true, s: 'pass' })).toEqual({ b: 1, s: 'pass' })
  })
  it('gets booleans', () => {
    expect(typeof getAdapter({ b: 1 }).b).toBe('boolean')
    expect(getAdapter({ b: 1 }).b).toBe(true)
    expect(getAdapter({ b: 0 }).b).toBe(false)
    expect(getAdapter({ b: 0 })).toEqual({ b: false })
    expect(getAdapter({ b: 1, s: 'pass' })).toEqual({ b: true, s: 'pass' })
  })

  it('set bools using validate.parseBoolean', () => {
    expect(setAdapter({ b: 'TEST'}).b).toBe(1)
    expect(setAdapter({ b: 'none'}).b).toBe(0)
    expect(setAdapter({ b: {}    }).b).toBe(0)
    expect(setAdapter({ b: ''    }).b).toBe(0)
  })
})

jest.mock('../../utils/validate.utils', () => ({
  getTypeArray: (type) => ({ type }),
  parseBoolean: () => (bool) => typeof bool !== 'boolean' ? bool === 'TEST' : bool
}))