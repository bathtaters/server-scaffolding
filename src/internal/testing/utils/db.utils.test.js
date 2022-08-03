const {
  checkInjection, extractId, appendAndSort, sanitizeSchemaData,
  boolsFromTypes, schemaFromTypes, adaptersFromTypes
} = require('../../utils/db.utils')
const { parseTypeStr } = require('../../utils/validate.utils')
const errors = require('../../config/errors.internal')

const testTypes = {
  test1: { a: 'string', b: 'int', c: 'object', d: 'datetime' },
  test2: { e: 'float',  f: 'boolean' },
}
const testSchema = {
  test1: { a: 'TEXT', b: 'INTEGER', c: 'TEXT', d: 'INTEGER' },
  test2: { e: 'REAL',  f: 'INTEGER' },
}

describe('checkInjection', () => {
  it('throws error when illegal value', () => {
    expect(() => checkInjection('Test.ILLEGAL!'))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!'))
  })
  it('throws error when illegal type', () => {
    expect(() => checkInjection(1234)).toThrowError(errors.sqlInjection(1234))
    expect(() => checkInjection(() => {})).toThrowError(errors.sqlInjection(() => {}))
  })
  it('deep checks arrays', () => {
    expect(() => checkInjection(['a','b',['c',['Test.ILLEGAL!']]]))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!'))
  })
  it('checks only object keys', () => {
    expect(() => checkInjection({ a: 1, b: 2, c: 3, d: 'Test.ILLEGAL!' })).not.toThrow()
    expect(() => checkInjection({ a: 1, b: 2, c: 3, 'Test.ILLEGAL!': 4 }))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!'))
  })
  it('returns value when not illegal', () => {
    expect(checkInjection('Test')).toBe('Test')
    expect(checkInjection('ANYTHING!')).toBe('ANYTHING!')
    const testArr = checkInjection(['a','b',['c',['d']]])
    expect(testArr).toBe(testArr)
    expect(testArr).toEqual(['a','b',['c',['d']]])
    const testObj = checkInjection({ a: 1, b: 2, c: 3, d: 4 })
    expect(testObj).toBe(testObj)
    expect(testObj).toEqual({ a: 1, b: 2, c: 3, d: 4 })
  })
  it('passes falsy values', () => {
    expect(checkInjection('')).toBe('')
    expect(checkInjection(0)).toBe(0)
    expect(checkInjection(false)).toBe(false)
    expect(checkInjection()).toBeUndefined()
  })
  it('passes tableName to error', () => {
    expect(() => checkInjection('Test.ILLEGAL!','tableName'))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!','tableName'))
    expect(() => checkInjection(['a','b',['c',['Test.ILLEGAL!']]],'tableName'))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!','tableName'))
  })
})

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
  it('does not include bool arrays', () => {
    parseTypeStr.mockReturnValueOnce({ type: 'string', isArray: false }).mockReturnValueOnce({ type: 'boolean', isArray: true })
    expect(boolsFromTypes(boolTest)).toEqual(['d'])
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
  // test2: { e: 'float',  f: 'boolean' },
  it('Adds NOT NULL when !isOptional', () => {
    parseTypeStr.mockReturnValueOnce({ type: 'string', isOptional: false })
      .mockReturnValueOnce({ type: 'boolean', isOptional: false })
    expect(schemaFromTypes(testTypes.test2)).toEqual({
      e: expect.stringContaining(' NOT NULL'),
      f: expect.stringContaining(' NOT NULL'),
    })
  })
  it('All arrays become TEXT', () => {
    parseTypeStr.mockReturnValueOnce({ type: 'string', isArray: true, isOptional: true })
      .mockReturnValueOnce({ type: 'boolean', isArray: true, isOptional: true })
    expect(schemaFromTypes(testTypes.test2)).toEqual({ e: 'TEXT', f: 'TEXT' })
  })
})

describe('adaptersFromTypes', () => {
  const { getAdapter, setAdapter } = adaptersFromTypes({ b: 'boolean', i: 'int', o: 'object', d: 'datetime', s: 'string' })

  it('returns functions when adapters exist', () => {
    expect(typeof getAdapter).toBe('function')
    expect(typeof setAdapter).toBe('function')
  })
  it('returns falsy when no adapters exist', () => {
    const { getAdapter, setAdapter } = adaptersFromTypes({ c: 'any', d: 'uuid', e: 'string' })
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
    expect(typeof getAdapter({ d: 1636243200000 }).d.getMonth).toBe('function')
    expect(getAdapter({ d: 1636243200000 }).d).toEqual(new Date(Date.UTC(2021, 10, 7)))
    expect(getAdapter({ d: 1594684800000 })).toEqual({ d: new Date(Date.UTC(2020, 6, 14)) })
    expect(getAdapter({ d: 1594684800000, s: 'pass' })).toEqual({ d: new Date(Date.UTC(2020, 6, 14)), s: 'pass' })
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
    // mock parseBool uses 'TEST' as true
    expect(setAdapter({ b: 'TEST'}).b).toBe(1)
    expect(setAdapter({ b: 'none'}).b).toBe(0)
    expect(setAdapter({ b: {}    }).b).toBe(0)
    expect(setAdapter({ b: ''    }).b).toBe(0)
  })

  describe('array types', () => {
    [...Array(6)].forEach(() => parseTypeStr.mockImplementationOnce((type) => ({ type, isArray: true })))
    const { getAdapter, setAdapter } = adaptersFromTypes({ b: 'boolean', i: 'integer', f: 'float', o: 'object', d: 'datetime', s: 'string' })

    // NOTE: mock parseArray uses '|' as delimiter (Instead of ,)
    it('sets simple arrays', () => {
      expect(typeof setAdapter({ s: ["1","2","3"] }).s).toBe('string')
      expect(setAdapter({ s: ["1","2","3"] }).s).toBe('["1","2","3"]')
      expect(setAdapter({ s: '1|2|3' }).s).toBe('["1","2","3"]')
    })
    it('gets simple arrays', () => {
      expect(Array.isArray(getAdapter({ s: '["1","2","3"]' }).s)).toBe(true)
      expect(getAdapter({ s: '["1","2","3"]' }).s).toEqual(["1","2","3"])
      expect(getAdapter({ s: '[]' }).s).toEqual([])
      expect(getAdapter({ s: '' }).s).toBeNull()
    })
    it('sets numeric arrays', () => {
      expect(setAdapter({ i: ["1","2","3"] }).i).toBe('[1,2,3]')
      expect(setAdapter({ i: '1|2|3' }).i).toBe('[1,2,3]')
      expect(setAdapter({ f: ["1.10","2.0","3.5"] }).f).toBe('[1.1,2,3.5]')
      expect(setAdapter({ f: '1.10|2.0|3.5' }).f).toBe('[1.1,2,3.5]')
    })
    it('sets boolean arrays', () => {
      expect(setAdapter({ b: ["TEST","none",""] }).b).toBe('[1,0,0]')
      expect(setAdapter({ b: 'TEST|none|' }).b).toBe('[1,0,0]')
      expect(setAdapter({ b: ["TEST","none",""] })).toEqual({ b: '[1,0,0]' })
    })
    it('gets boolean arrays', () => {
      expect(getAdapter({ b: '[1,0,0]' }).b).toEqual([true,false,false])
      expect(getAdapter({ b: '[1,0,0]' }).b).toEqual([true,false,false])
      expect(getAdapter({ b: '[1,0,0]' })).toEqual({ b: [true,false,false] })
    })
    it('sets datetime arrays', () => {
      expect(setAdapter({ d: [new Date(Date.UTC(2021, 10, 7)),"2006-01-02T00:00:00",123] }).d)
        .toBe('[1636243200000,1136178000000,123]')
      expect(setAdapter({ d: '2021-10-07T00:00:00|2006-01-02T00:00:00|1236286200000' }).d)
        .toBe('[1633579200000,1136178000000,1236286200000]')
      expect(setAdapter({ d: [new Date(Date.UTC(2021, 10, 7)),"2006-01-02T00:00:00",123] }))
        .toEqual({ d: '[1636243200000,1136178000000,123]' })
    })
    it('gets datetime arrays', () => {
      expect(getAdapter({ d: '[1636243200000,1594684800000]' }).d)
        .toEqual([ new Date(Date.UTC(2021, 10, 7)),  new Date(Date.UTC(2020, 6, 14)) ])
      expect(getAdapter({ d: '[1636243200000,1594684800000]' }))
        .toEqual({ d: [new Date(Date.UTC(2021, 10, 7)),  new Date(Date.UTC(2020, 6, 14))] })
    })
    it('sets object arrays', () => {
      expect(setAdapter({ o: [{ a: 1, b: 2 },{ c: 3 }] }).o).toBe('[{"a":1,"b":2},{"c":3}]')
      expect(setAdapter({ o: ['{"a":1}','{"b":2,"c":3}'] }).o).toBe('[{"a":1},{"b":2,"c":3}]')
      expect(setAdapter({ o: '{"a":1}|{"b":2,"c":3}|{"d":"4"}' }).o)
        .toBe('[{"a":1},{"b":2,"c":3},{"d":"4"}]')
      expect(setAdapter({ o: [{ a: 1, b: 2 },{ c: 3 }] }))
        .toEqual({ o: '[{"a":1,"b":2},{"c":3}]' })
    })
    it('gets object arrays', () => {
      expect(getAdapter({ o: '[{"a":1,"b":2},{"c":3}]' }).o).toEqual([{ a: 1, b: 2 },{ c: 3 }])
      expect(getAdapter({ o: '[{"a":1,"b":2},{"c":3}]' }))
        .toEqual({ o: [{ a: 1, b: 2 },{ c: 3 }] })
    })
  })
})

jest.mock('../../config/validate.cfg', () => ({ illegalKeyName: /ILLEGAL/ }))
jest.mock('../../utils/validate.utils', () => ({
  parseTypeStr: jest.fn((type) => ({ type, isOptional: true })),
  parseArray: () => (arr) => arr.split('|'),
  parseBoolean: () => (bool) => typeof bool !== 'boolean' ? bool === 'TEST' : bool,
}))