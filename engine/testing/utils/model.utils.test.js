const {
  parseTypeStr, isBool, sanitizeSchemaData,
  dbFromType, htmlFromType, getAdapterFromType, setAdapterFromType,
} = require('../../utils/model.utils')


describe('parseTypeStr', () => {
  it('nothing', () => {
    expect(parseTypeStr({})).toEqual({})
    expect(parseTypeStr({ typeStr: '' })).toEqual({ typeStr: '' })
  })
  it('.typeStr passed', () => {
    expect(parseTypeStr({ typeStr: 'test' }).typeStr).toBe('test')
    expect(parseTypeStr({ typeStr: 'test*[]?' }).typeStr).toBe('test*[]?')
  })
  it('.type = typeStr', () => {
    expect(parseTypeStr({ typeStr: 'test' }).type).toBe('test')
    expect(parseTypeStr({ typeStr: 'test*[]?' }).type).toBe('test')
  })
  it('.isOptional = isOptional', () => {
    expect(parseTypeStr({ typeStr: 'test'  }).isOptional).toBe(false)
    expect(parseTypeStr({ typeStr: 'test?' }).isOptional).toBe(true)
    expect(parseTypeStr({ typeStr: 'test*[]'  }).isOptional).toBe(false)
    expect(parseTypeStr({ typeStr: 'test*[]?' }).isOptional).toBe(true)
    expect(parseTypeStr({ typeStr: 'test*?[]' }).isOptional).toBe(true)
    expect(parseTypeStr({ typeStr: 'test?*[]' }).isOptional).toBe(true)
  })
  it('.isArray = isArray', () => {
    expect(parseTypeStr({ typeStr: 'test' }).isArray).toBe(false)
    expect(parseTypeStr({ typeStr: 'test[]' }).isArray).toBe(true)
    expect(parseTypeStr({ typeStr: 'test*?' }).isArray).toBe(false)
    expect(parseTypeStr({ typeStr: 'test[]*?' }).isArray).toBe(true)
    expect(parseTypeStr({ typeStr: 'test*[]?' }).isArray).toBe(true)
    expect(parseTypeStr({ typeStr: 'test*?[]' }).isArray).toBe(true)
  })
  it('.hasSpaces = leaveWhiteSpace', () => {
    expect(parseTypeStr({ typeStr: 'test' }).hasSpaces).toBe(false)
    expect(parseTypeStr({ typeStr: 'test*' }).hasSpaces).toBe(true)
    expect(parseTypeStr({ typeStr: 'test[]?' }).hasSpaces).toBe(false)
    expect(parseTypeStr({ typeStr: 'test*[]?' }).hasSpaces).toBe(true)
    expect(parseTypeStr({ typeStr: 'test[]*?' }).hasSpaces).toBe(true)
    expect(parseTypeStr({ typeStr: 'test[]?*' }).hasSpaces).toBe(true)
  })
  it('invalid string throws an error', () => {
    expect(() => parseTypeStr({ typeStr: 'test*[]?test' })).toThrowError()
  })
})


describe('isBool', () => {
  it('true', () => {
    expect(isBool({ type: 'boolean' })).toBe(true)
    expect(isBool({ type: 'boolean', isArray: false })).toBe(true)
  })
  it('false', () => {
    expect(isBool({ type: 'string',  isArray: true  })).toBe(false)
    expect(isBool({ type: 'boolean', isArray: true  })).toBe(false)
    expect(isBool({ type: 'string',  isArray: false })).toBe(false)
  })
})


describe('sanitizeSchemaData', () => {
  const schema = { a: { db: true }, b: { db: true }, c: { db: true } }
  it('passes all if no schema', () => {
    expect(sanitizeSchemaData({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
  })
  it('passes props in schema', () => {
    expect(sanitizeSchemaData({ a: 1, b: 2 }, schema))
      .toEqual({ a: 1, b: 2 })
  })
  it('filters props not in schema', () => {
    expect(sanitizeSchemaData({ a: 1, b: 2, d: 4 }, { schema }))
      .toEqual({ a: 1, b: 2 })
  })
  it('filters props not in schema or arrays', () => {
    const arrays = { c: null, d: 'test' }
    expect(sanitizeSchemaData({ a: 1, d: 4, e: 5 }, { schema, arrays }))
      .toEqual({ a: 1, d: 4 })
  })
  it('skips schema props w/o db value', () => {
    const schemaCopy = { ...schema, b: { db: null } }
    expect(sanitizeSchemaData({ a: 1, b: 2 }, { schema: schemaCopy }))
      .toEqual({ a: 1 })
  })
})


const testTypes = {
  str: { type: 'string',   isArray: false, isOptional: true,  isPrimary: false },
  int: { type: 'int',      isArray: false, isOptional: true,  isPrimary: false },
  obj: { type: 'object',   isArray: false, isOptional: true,  isPrimary: false },
  dt:  { type: 'datetime', isArray: false, isOptional: true,  isPrimary: false },
  flt: { type: 'float',    isArray: false, isOptional: true,  isPrimary: false },
  bool:{ type: 'boolean',  isArray: false, isOptional: true,  isPrimary: false },
  pri: { type: 'int',      isArray: false, isOptional: true,  isPrimary: true  },
  req: { type: 'int',      isArray: false, isOptional: false, isPrimary: false },
  arr: { type: 'int',      isArray: true,  isOptional: true,  isPrimary: false },
  bits:{ type: 'int',      isArray: false, isOptional: false, isBitmap:  true  },
}


describe('dbFromType', () => {
  it('converts types', () => {
    expect(dbFromType(testTypes.str )).toBe('TEXT')
    expect(dbFromType(testTypes.int )).toBe('INTEGER')
    expect(dbFromType(testTypes.obj )).toBe('TEXT')
    expect(dbFromType(testTypes.dt  )).toBe('INTEGER')
    expect(dbFromType(testTypes.flt )).toBe('REAL')
    expect(dbFromType(testTypes.bool)).toBe('INTEGER')
  })
  it('flags primaryKey', () => {
    expect(dbFromType(testTypes.pri)).toContain('PRIMARY KEY')
    expect(dbFromType(testTypes.int)).not.toContain('PRIMARY KEY')
  })
  it('flags required (non-optional)', () => {
    expect(dbFromType(testTypes.req)).toContain('NOT NULL')
    expect(dbFromType(testTypes.int)).not.toContain('NOT NULL')
  })
})


describe('htmlFromType', () => {
  it('converts types', () => {
    expect(htmlFromType(testTypes.str )).toBe('text')
    expect(htmlFromType(testTypes.int )).toBe('number')
    expect(htmlFromType(testTypes.obj )).toBe('text')
    expect(htmlFromType(testTypes.dt  )).toBe('datetime-local')
    expect(htmlFromType(testTypes.flt )).toBe('number')
    expect(htmlFromType(testTypes.bool)).toBe('checkbox')
  })
  it('all arrays are text', () => {
    expect(htmlFromType(testTypes.arr)).toBe('text')
  })
})


describe('getAdapterFromType', () => {

  it('returns functions when adapters exist', () => {
    expect(typeof getAdapterFromType(testTypes.obj)).toBe('function')
    expect(typeof getAdapterFromType(testTypes.dt)).toBe('function')
    expect(typeof getAdapterFromType(testTypes.bool)).toBe('function')
  })
  it('returns falsy when no adapters exist', () => {
    expect(getAdapterFromType(testTypes.str)).toBeFalsy()
    expect(getAdapterFromType(testTypes.int)).toBeFalsy()
    expect(getAdapterFromType(testTypes.flt)).toBeFalsy()
  })

  it('objects', () => {
    const adapter = getAdapterFromType(testTypes.obj)
    expect(typeof adapter('{"a":"test","b":1}')).toBe('object')
    expect(adapter('{"a":"test","b":1}')).toEqual({ a: 'test', b: 1 })
    expect(adapter('[1,"test",2,3]')).toEqual([1,'test',2,3])
    expect(adapter({ a: 'test', b: 1 })).toEqual({ a: 'test', b: 1 })
    expect(adapter(null)).toBeNull()
  })

  it('dates', () => {
    const adapter = getAdapterFromType(testTypes.dt)
    expect(typeof adapter(1636243200000).getMonth).toBe('function')
    expect(adapter(1636243200000)).toEqual(new Date(Date.UTC(2021, 10, 7)))
    expect(adapter(1594684800000)).toEqual(new Date(Date.UTC(2020, 6, 14)))
    expect(adapter(null)).toBeNull()
  })

  it('booleans', () => {
    const adapter = getAdapterFromType(testTypes.bool)
    expect(typeof adapter(1)).toBe('boolean')
    expect(adapter(1)).toBe(true)
    expect(adapter('0')).toBe(false)
    expect(adapter(null)).toBeNull()
  })

  it('bitmaps (no implementation)', () => {
    expect(getAdapterFromType(testTypes.bits)).toBeUndefined()
  })

  describe('array types', () => {
    // NOTE: mock dbArray uses '!' as delimiter (CONCAT_DELIM)
    it('simple arrays', () => {
      const adapter = getAdapterFromType({ ...testTypes.arr, type: 'string' })
      expect(Array.isArray(adapter('1!2!3'))).toBe(true)
      expect(adapter('1!2!3')).toEqual(["1","2","3"])
      expect(adapter(["1","2","3"])).toEqual(["1","2","3"])
      expect(adapter('')).toBeNull()
    })
    it('boolean arrays', () => {
      const adapter = getAdapterFromType({ ...testTypes.arr, type: 'boolean' })
      expect(adapter('1!0!0')).toEqual([true,false,false])
      expect(adapter([1,0,'0'])).toEqual([true,false,false])
    })
    it('datetime arrays', () => {
      const adapter = getAdapterFromType({ ...testTypes.arr, type: 'datetime' })
      expect(adapter('1636243200000!1594684800000')).toEqual([
        new Date(Date.UTC(2021, 10, 7)),
        new Date(Date.UTC(2020, 6, 14)),
      ])
      expect(adapter(['1636243200000',1594684800000,new Date(Date.UTC(2017, 2, 12))])).toEqual([
        new Date(Date.UTC(2021, 10, 7)),
        new Date(Date.UTC(2020, 6, 14)),
        new Date(Date.UTC(2017, 2, 12)),
      ])
    })
    it('object arrays', () => {
      const adapter = getAdapterFromType({ ...testTypes.arr, type: 'object' })
      expect(adapter('{"a":1,"b":2}!{"c":3}'))
        .toEqual([{ a: 1, b: 2 },{ c: 3 }])
      expect(adapter(['{"a":1,"b":2}',{c:3}]))
        .toEqual([{ a: 1, b: 2 },{ c: 3 }])
    })
  })
})


describe('setAdapterFromType', () => {

  it('returns functions when adapters exist', () => {
    expect(typeof setAdapterFromType(testTypes.int)).toBe('function')
    expect(typeof setAdapterFromType(testTypes.flt)).toBe('function')
    expect(typeof setAdapterFromType(testTypes.obj)).toBe('function')
    expect(typeof setAdapterFromType(testTypes.dt)).toBe('function')
    expect(typeof setAdapterFromType(testTypes.bool)).toBe('function')
  })
  it('returns falsy when no adapters exist', () => {
    expect(setAdapterFromType(testTypes.str)).toBeFalsy()
  })

  it('integer', () => {
    const adapter = setAdapterFromType(testTypes.int)
    expect(typeof adapter('12')).toBe('number')
    expect(adapter('12')).toBe(12)
    expect(adapter('12.34')).toBe(12)
    expect(adapter(12)).toBe(12)
    expect(adapter('apple')).toBeNaN()
    expect(adapter(null)).toBeNull()
  })

  it('float', () => {
    const adapter = setAdapterFromType(testTypes.flt)
    expect(typeof adapter('12.34')).toBe('number')
    expect(adapter('12')).toBe(12)
    expect(adapter('12.34')).toBe(12.34)
    expect(adapter(12.34)).toBe(12.34)
    expect(adapter('apple')).toBeNaN()
    expect(adapter(null)).toBeNull()
  })

  it('objects', () => {
    const adapter = setAdapterFromType(testTypes.obj)
    expect(typeof adapter({ a: 'test', b: 1 })).toBe('string')
    expect(adapter({ a: 'test', b: 1 })).toBe('{"a":"test","b":1}')
    expect(adapter('{"a":"test","b":1}')).toBe('{"a":"test","b":1}')
    expect(adapter([1,'test',2,3])).toBe('[1,"test",2,3]')
    expect(adapter(null)).toBeNull()
  })

  it('dates', () => {
    const adapter = setAdapterFromType(testTypes.dt)
    expect(typeof adapter(new Date())).toBe('number')
    expect(adapter(new Date(Date.UTC(2021, 10, 7)))).toBe(1636243200000)
    expect(adapter('2006-01-02T00:00:00')).toBe(1136178000000)
    expect(adapter('1594684800000')).toBe(1594684800000)
    expect(adapter(1236286200000)).toBe(1236286200000)
    expect(adapter(null)).toBeNull()
  })

  it('booleans (using parseBoolean)', () => {
    // mock parseBool uses 'TEST' as true
    const adapter = setAdapterFromType(testTypes.bool)
    expect(typeof adapter('TEST')).toBe('number')
    expect(adapter('TEST')).toBe(1)
    expect(adapter('none')).toBe(0)
    expect(adapter({})).toBe(0)
    expect(adapter('')).toBe(0)
    expect(adapter(null)).toBeNull()
  })

  it('bitmaps (no implementation)', () => {
    expect(setAdapterFromType(testTypes.bits)).toBeUndefined()
  })

  describe('array types', () => {
    // NOTE: mock parseArray uses '|' as delimiter (Instead of ,)
    it('simple arrays', () => {
      const adapter = setAdapterFromType({ ...testTypes.arr, type: 'string' })
      expect(Array.isArray(adapter(["1","2","3"]))).toBe(true)
      expect(adapter(["1","2","3"])).toEqual(["1","2","3"])
      expect(adapter('1|2|3')).toEqual(["1","2","3"])
      expect(adapter(null)).toBeNull()
    })
    it('integer arrays', () => {
      const adapter = setAdapterFromType({ ...testTypes.arr, type: 'int' })
      expect(adapter(["1","2","3"])).toEqual([1,2,3])
      expect(adapter('1|2|3')).toEqual([1,2,3])
    })
    it('float arrays', () => {
      const adapter = setAdapterFromType({ ...testTypes.arr, type: 'float' })
      expect(adapter(["1.10","2.0","3.5"])).toEqual([1.1,2,3.5])
      expect(adapter('1.10|2.0|3.5')).toEqual([1.1,2,3.5])
    })
    it('boolean arrays', () => {
      const adapter = setAdapterFromType({ ...testTypes.arr, type: 'boolean' })
      expect(adapter(["TEST","none",""])).toEqual([1,0,0])
      expect(adapter('TEST|none|')).toEqual([1,0,0])
    })
    it('datetime arrays', () => {
      const adapter = setAdapterFromType({ ...testTypes.arr, type: 'datetime' })
      expect(adapter([new Date(Date.UTC(2021, 10, 7)),"2006-01-02T00:00:00",123]))
        .toEqual([1636243200000,1136178000000,123])
      expect(adapter('2021-10-07T00:00:00|2006-01-02T00:00:00|1236286200000'))
        .toEqual([1633579200000,1136178000000,1236286200000])
    })
    it('object arrays', () => {
      const adapter = setAdapterFromType({ ...testTypes.arr, type: 'object' })
      expect(adapter([{ a: 1, b: 2 },{ c: 3 }]))
        .toEqual(['{"a":1,"b":2}','{"c":3}'])
      expect(adapter(['{"a":1}','{"b":2,"c":3}']))
        .toEqual(['{"a":1}','{"b":2,"c":3}'])
      expect(adapter('{"a":1}|{"b":2,"c":3}|{"d":"4"}'))
        .toEqual(['{"a":1}','{"b":2,"c":3}','{"d":"4"}'])
    })
  })
})


// MOCKS

jest.mock('../../libs/regex', () => (re) => re)
jest.mock('../../libs/date', () => ({ isDate: (dt) => typeof dt.getMonth === 'function' }))
jest.mock('../../config/models.cfg', () => ({ arrayLabel: {}, CONCAT_DELIM: '!' }))
jest.mock('../../utils/validate.utils', () => ({
  parseBoolean: () => (val) => val === 'TEST',
  parseArray: () => (val) => val.split('|'),
}))