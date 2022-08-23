const { getSettingsVars, stringifyEnv, filterOutProps, escapeSettings, getChanged } = require('../../utils/settings.utils')


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

describe('escapeSettings', () => {
  const callback = jest.fn()
  const replacer = escapeSettings(callback)

  it('replaces each escapeChar', () => {
    expect(replacer({ test: '~TE~ST##' })).toEqual({ test: '!TE!ST++' })
  })
  it('calls callback for each replaceChar', () => {
    replacer({ test: 'TE~ST#' })
    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith('~',expect.any(Number),expect.any(String))
    expect(callback).toBeCalledWith('#',expect.any(Number),expect.any(String))
  })
  it('replaces escapeChar in keys', () => {
    expect(replacer({ 'TE~ST#': 'test' })).toEqual({ 'TE!ST+': 'test' })
    expect(callback).toBeCalledTimes(2)
    expect(callback).toBeCalledWith('~',expect.any(Number),expect.any(String))
    expect(callback).toBeCalledWith('#',expect.any(Number),expect.any(String))
  })
  it('skips replace on non-strings', () => {
    const arr = ['a', 'b', 'c']
    expect(replacer({})).toEqual({})
    expect(replacer({ test: 12 })).toEqual({ test: 12 })
    expect(replacer({ test: null })).toEqual({ test: null })
    expect(replacer({ test: false })).toEqual({ test: false })
    expect(replacer({ test: { a: 1, b: 2 } })).toEqual({ test: { a: 1, b: 2 } })
    expect(replacer({ test: arr })).toEqual({ test: ['a','b','c'] })
    expect(replacer({ test: arr }).test).toBe(arr)
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

// MOCKS

jest.mock('../../config/settings.cfg', () => ({
  definitions: {
    testA: { default: 'TEST-1' },
    testB: { default: 'TEST-2' },
    testC: { default: 'TEST-3' },
  },
  escapeChars: [ [/~/g, '!'], [/#/g, '+']  ]
}))