const { varName, getTableFields, getSchema, mask } = require('../../utils/gui.utils')

jest.mock('../../../config/gui.cfg', () => ({
  varNameDict: { testDict: 'TEST' },
  sql2html: [ [/SQL/, 'html'], [/TEST/, 'new'], ],
  MASK_CHAR: '*',
}))

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