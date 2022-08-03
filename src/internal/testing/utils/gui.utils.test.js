const { varName, getTableFields, getTypes, getSchema, mask, formatGuiData } = require('../../utils/gui.utils')
const { parseTypeStr } = require('../../utils/validate.utils')

describe('varName', () => {
  it('capitalizes first char', () => {
    expect(varName('test')).toBe('Test')
  })
  it('adds space before capitals', () => {
    expect(varName('TestNameTest').trim()).toBe('Test Name Test')
  })
  it('removes leading underscore', () => {
    expect(varName('_testName')).toBe('Test Name')
  })
  it('uses varNameDict', () => {
    expect(varName('testDict')).toBe('TEST')
  })
})

describe('getTableFields', () => {
  it('passes all keys', () => {
    expect(Object.keys(getTableFields({ a: 1, b: 2, c: 3 }, ''))).toEqual(['a','b','c'])
  })
  it('moves ID to start', () => {
    expect(Object.keys(getTableFields({ a: 1, b: 2, c: 3 }, 'b'))).toEqual(['b','a','c'])
  })
  it('translates with varName', () => {
    expect(getTableFields({ test: 1, _testName: 2, testDict: 3 }, ''))
      .toEqual({
        test: 'Test',
        _testName: 'Test Name',
        testDict: 'TEST',
      })
  })
})

describe('formatGuiData', () => {
  it('passes data array', () => {
    expect(formatGuiData([
      { a: 1, b: 2, c: 3 }, { a: 'a', b: 'b', c: 'c'},
      { a: true, b: false }, { a: null, b: undefined }
    ])).toEqual([
      { a: 1, b: 2, c: 3 }, { a: 'a', b: 'b', c: 'c'},
      { a: true, b: false }, { a: null, b: undefined }
    ])
  })
  it('changes string array to string list', () => {
    expect(formatGuiData([{ test: ['add','bad','cab'] }])[0].test)
      .toBe('add, bad, cab')
    expect(formatGuiData([{ test: ['1','','30'] }])[0].test)
      .toBe('1, , 30')
  })
  it('changes object array to stringified list', () => {
    expect(formatGuiData([{ test: [{ a: 1, b: 2 },{ c: 'cab', d: 'dab' }] }])[0].test)
      .toBe('{"a":1,"b":2}, {"c":"cab","d":"dab"}')
  })
  it('changes other arrays to toLocaleString list', () => {
    const dateStr = new Date(2006,12,24).toLocaleString()
    expect(formatGuiData([{ test: [true,new Date(2006,12,24),123,null,undefined] }])[0].test)
      .toBe(`true, ${dateStr}, 123, null, undefined`)
  })
  it('stringifies non-date/non-null objects', () => {
    expect(formatGuiData([{ test: {} }])[0].test).toBe('{}')
    expect(formatGuiData([{ test: { a: 'add', b: [1,2,3], c: null, d: true }}])[0].test)
      .toBe('{"a":"add","b":[1,2,3],"c":null,"d":true}')
  })
})

describe('getTypes', () => {
  it('defaults to "text"', () => {
    expect(getTypes({ a: '1', b: '2', c: '3' },''))
      .toEqual({ a: 'text', b: 'text', c: 'text' })
  })
  it('converts bools/numbers', () => {
    expect(getTypes({ a: 'boolean', b: 'int', c: 'float' },''))
      .toEqual({ a: 'checkbox', b: 'number', c: 'number' })
  })
  it('converts date/time types', () => {
    expect(getTypes({ a: 'date', b: 'datetime' },''))
      .toEqual({ a: 'date', b: 'datetime-local' })
  })
  it('filters out idKey', () => {
    expect(Object.keys(getTypes({ a: '1', b: '2', c: '3' }, 'a'))).toEqual(['b','c'])
    expect(Object.keys(getTypes({ a: '1', b: '2', c: '3' }, 'b'))).toEqual(['a','c'])
  })
  it('arrays always are text', () => {
    [...Array(6)].forEach(() => parseTypeStr.mockImplementationOnce((type) => ({ type, isArray: true })))
    expect(getTypes({ a: 'boolean', b: 'int', c: 'float', d: 'date', e: 'datetime', f: 'string' },''))
      .toEqual({ a: 'text', b: 'text', c: 'text', d: 'text', e: 'text', f: 'text' })
  })
})

describe('getSchema', () => {
  it('passes unrecognized values', () => {
    expect(getSchema({ a: '1', b: '2', c: '3' },''))
      .toEqual({ a: '1', b: '2', c: '3' })
  })
  it('translates using sql2html', () => {
    expect(getSchema({ a: 'SQL', b: 'TEST', c: 'MORE_SQL!' },''))
      .toEqual({ a: 'html', b: 'new', c: 'html' })
  })
  it('filters out idKey', () => {
    expect(Object.keys(getSchema({ a: '1', b: '2', c: '3' }, 'a'))).toEqual(['b','c'])
    expect(Object.keys(getSchema({ a: '1', b: '2', c: '3' }, 'b'))).toEqual(['a','c'])
  })
  it('forces boolKeys to cfg.boolInputType', () => {
    expect(getSchema({ a: 'SQL', b: 'TEST', c: 'MORE_SQL!' },'',['b','c']))
      .toEqual({ a: 'html', b: 'BOOL_CFG', c: 'BOOL_CFG' })
  })
})

describe('mask', () => {
  it('masks by type', () => {
    expect(mask(12n)).toBe('**')
    expect(mask(12)).toBe('**')
    expect(mask(-150)).toBe('****')
    expect(mask('test')).toBe('****')
    expect(mask('longertest')).toBe('**********')
    expect(mask('')).toBe('')
    expect(mask(null)).toBe('null')
    expect(mask(undefined)).toBe('undefined')
    expect(mask(() => {})).toBe('[function]')
    expect(mask(true)).toBe('[boolean]')
    expect(mask(false)).toBe('[boolean]')
    expect(mask(Symbol('test'))).toBe('[symbol]')
  })
  it('deep masks arrays', () => {
    expect(mask(['test',12,false,null])).toEqual(['****','**','[boolean]','null'])
    expect(mask(['test',[12,false,[null]]])).toEqual(['****',['**','[boolean]',['null']]])
  })
  it('deep masks objects', () => {
    expect(mask({ a: 'test', b: 12, c: false, d: null }))
      .toEqual({ a: '****', b: '**', c: '[boolean]', d: 'null' })
    expect(mask({ a: 'test', b: { c: 12, d: false, e: { f: null }}}))
      .toEqual({ a: '****', b: { c: '**', d: '[boolean]', e: { f: 'null' }}})
  })
})


// MOCKS

jest.mock('../../utils/validate.utils', () => ({ parseTypeStr: jest.fn((type) => ({ type })) }))
jest.mock('../../../config/gui.cfg', () => ({
  varNameDict: { testDict: 'TEST' },
  sql2html: [ [/SQL/, 'html'], [/TEST/, 'new'], ],
  MASK_CHAR: '*',
  boolInputType: 'BOOL_CFG',
}))