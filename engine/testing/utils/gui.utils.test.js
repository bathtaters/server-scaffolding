const { varName, getTableFields, mask, formatGuiData } = require('../../utils/gui.utils')

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
  it('stringifies simple object', () => {
    expect(formatGuiData({ test: { a: 1, b: 2, c: 'cab', d: 'dab' } }).test)
      .toBe('{"a":1,"b":2,"c":"cab","d":"dab"}')
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

jest.mock('../../libs/date', () => ({ isDate: (dt) => typeof dt.getMonth === 'function' }))
jest.mock(require('../../src.path').config+'gui.cfg', () => ({
  varNameDict: { testDict: 'TEST' },
  MASK_CHAR: '*',
}))