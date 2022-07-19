const { getSettingsVars, stringifyEnv, filterOutProps, deepReplace, getChanged } = require('../../utils/settings.utils')
const { deepMap } = require('../../utils/common.utils')

jest.mock('../../utils/common.utils', () => ({ deepMap: jest.fn((val,cb) => cb(val)) }))
jest.mock('../../config/settings.cfg', () => ({
  defaults: { testA: 'TEST-1', testB: 'TEST-2', testC: 'TEST-3' },
  replaceEnvChars: ['~!', '#']
}))

describe('getSettingsVars', () => {
  it('gets from second arg', () => {
    expect(getSettingsVars(['NODE_ENV'], { NODE_ENV: 'custom' }))
      .toEqual({ NODE_ENV: 'custom' })
  })
  it('gets from process.env if no second arg', () => {
    expect(getSettingsVars(['NODE_ENV'])).toEqual({ NODE_ENV: 'test' })
  })
  it('gets missing from settings.cfg.defaults', () => {
    expect(getSettingsVars(['testA'], {})).toEqual({ testA: 'TEST-1' })
    expect(getSettingsVars(['testB'], {})).toEqual({ testB: 'TEST-2' })
    expect(getSettingsVars(['testA','testC'], {}))
      .toEqual({ testA: 'TEST-1', testC: 'TEST-3' })
  })
  it('returns undefined otherwise', () => {
    expect(getSettingsVars(['test'], {})).toEqual({ test: undefined })
  })
})

describe('stringifyEnv', () => {
  it('returns string', () => {
    expect(typeof stringifyEnv({})).toBe('string')
  })
  it('converts object to .env text', () => {
    expect(stringifyEnv({ a: 1, b: "test" })).toBe('a=1\nb=test\n')
  })
})

describe('filterOutProps', () => {
  it('returns input object', () => {
    const obj = { a: 1, b: 2, c: 3 }
    expect(filterOutProps(obj, [])).toBe(obj)
    expect(filterOutProps(obj, [])).toEqual({ a: 1, b: 2, c: 3 })
  })
  it('removes listed props', () => {
    expect(filterOutProps({ a: 1, b: 2, c: 3, d: 4, TeSt: 'data' }, ['a', 'TeSt']))
      .toEqual({ b: 2, c: 3, d: 4 })
  })
  it('mutates input object', () => {
    const obj = { a: 1, b: 2, c: 3 }
    filterOutProps(obj, ['a', 'TeSt'])
    expect(obj).toEqual({ b: 2, c: 3 })
  })
})

describe('deepReplace', () => {
  const callback = jest.fn()
  const replacer = deepReplace(callback)

  it('calls deepMap', () => {
    replacer('TEST')
    expect(deepMap).toBeCalledTimes(1)
    expect(deepMap).toBeCalledWith('TEST', expect.any(Function))
  })
  it('replaces each replaceChar', () => {
    expect(replacer('~TE~ST!!')).toBe('#TE#ST##')
  })
  it('calls callback for each replaceChar', () => {
    replacer('TE~ST!')
    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith('~',2,'TE~ST!')
    expect(callback).toBeCalledWith('!',5,'TE~ST!')
  })
  it('skips replace on non-strings', () => {
    const arr = ['a', 'b', 'c']
    expect(replacer()).toBeUndefined()
    expect(replacer(12)).toBe(12)
    expect(replacer(null)).toBeNull()
    expect(replacer(false)).toBe(false)
    expect(replacer({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 })
    expect(replacer(arr)).toEqual(['a','b','c'])
    expect(replacer(arr)).toBe(arr)
    expect(callback).toBeCalledTimes(0)
  })
})

describe('getChanged', () => {
  it('returns empty object when missing input', () => {
    expect(getChanged({ a: 1, b: '2', c: 'test' })).toEqual({})
    expect(getChanged(null,{ a: 1, b: '2', c: 'test' })).toEqual({})
  })
  it('returns empty object when equal inputs', () => {
    expect(getChanged({ a: 1, b: '2', c: 'test' },{ a: 1, b: '2', c: 'test' }))
      .toEqual({})
  })
  it('returns empty object when equal inputs', () => {
    expect(getChanged({ a: 1, b: '2', c: 'test' },{ a: 1, b: '2', c: 'test' }))
      .toEqual({})
  })
  it('returns base value of each changed values', () => {
    expect(getChanged({ a: 1, b: '2', c: 'test' },{ a: 5, b: '2', c: 'test2' }))
      .toEqual({ a: 1, c: 'test' })
  })
  it('ignore values not in update', () => {
    const result = getChanged({ a: 1, b: '2', c: 'test' },{ b: '2', c: 'test2' })
    expect(result).not.toHaveProperty('a')
    expect(result).toEqual({ c: 'test' })
  })
  it('returns undefined for values not in base', () => {
    const result = getChanged({ b: '2', c: 'test' },{ a: 1, b: '2', c: 'test2' })
    expect(result).toHaveProperty('a', undefined)
    expect(result).toEqual({ c: 'test' })
  })
})