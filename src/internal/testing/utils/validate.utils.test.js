// Setup ESC/UNESC spies
const validator = require('validator').default
const unescSpy = jest.spyOn(validator, 'unescape')

// Imports
const { 
  getTypeArray, formSettingsToValidate,
  isBoolean, parseBoolean, looseBools, dateOptions,
  escapedLength, deepUnescape
} = require('../../utils/validate.utils')

describe('getTypeArray', () => {
  it('nothing', () => {
    expect(getTypeArray()).toBeFalsy()
    expect(getTypeArray('')).toBeFalsy()
  })
  it('[0] = input', () => {
    expect(getTypeArray('test')[0]).toBe('test')
    expect(getTypeArray('test*[]?')[0]).toBe('test*[]?')
  })
  it('[1] = typeStr', () => {
    expect(getTypeArray('test')[1]).toBe('test')
    expect(getTypeArray('test*[]?')[1]).toBe('test')
  })
  it('[2] = leaveWhiteSpace', () => {
    expect(getTypeArray('test')[2]).toBeFalsy()
    expect(getTypeArray('test*')[2]).toBe('*')
    expect(getTypeArray('test[]?')[2]).toBeFalsy()
    expect(getTypeArray('test*[]?')[2]).toBe('*')
  })
  it('[3] = isArray', () => {
    expect(getTypeArray('test')[3]).toBeFalsy()
    expect(getTypeArray('test[]')[3]).toBe('[]')
    expect(getTypeArray('test*?')[3]).toBeFalsy()
    expect(getTypeArray('test*[]?')[3]).toBe('[]')
  })
  it('[4] = isOptional', () => {
    expect(getTypeArray('test')[4]).toBeFalsy()
    expect(getTypeArray('test?')[4]).toBe('?')
    expect(getTypeArray('test*[]')[4]).toBeFalsy()
    expect(getTypeArray('test*[]?')[4]).toBe('?')
  })
})

describe('formSettingsToValidate', () => {
  it('format for additionalOnly', () => {
    expect(formSettingsToValidate({ a: { type: 'text', limits: 'limitsA' }, b: { type: 'number', limits: 'limitsB' } }, 'inTest'))
      .toEqual([
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: expect.anything() },
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: expect.anything() },
      ])
  })
  it('pass keys', () => {
    expect(formSettingsToValidate({ a: { type: 'text', limits: 'limitsA' }, b: { type: 'number', limits: 'limitsB' } }, 'inTest'))
      .toEqual([
        { key: 'a', isIn: expect.any(String), typeStr: expect.any(String), limits: expect.anything() },
        { key: 'b', isIn: expect.any(String), typeStr: expect.any(String), limits: expect.anything() },
      ])
  })
  it('pass isIn', () => {
    expect(formSettingsToValidate({ a: { type: 'text', limits: 'limitsA' }, b: { type: 'number', limits: 'limitsB' } }, 'inTest'))
      .toEqual([
        { key: expect.any(String), isIn: 'inTest', typeStr: expect.any(String), limits: expect.anything() },
        { key: expect.any(String), isIn: 'inTest', typeStr: expect.any(String), limits: expect.anything() },
      ])
  })
  it('pass limits', () => {
    expect(formSettingsToValidate({ a: { type: 'text', limits: 'limitsA' }, b: { type: 'number', limits: 'limitsB' } }, 'inTest'))
      .toEqual([
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: 'limitsA' },
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: 'limitsB' },
      ])
  })
  it('number => int', () => {
    expect(formSettingsToValidate({ a: { type: 'text', limits: 'limitsA' }, b: { type: 'number', limits: 'limitsB' } }, 'inTest'))
      .toEqual([
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: expect.anything() },
        { key: expect.any(String), isIn: expect.any(String), typeStr: 'int', limits: expect.anything() },
      ])
  })
  it('else/array => string', () => {
    expect(formSettingsToValidate({ a: { type: 'text', limits: 'limitsA' }, b: { type: ['op','option','longOption'], limits: 'limitsB' } }, 'inTest'))
      .toEqual([
        { key: expect.any(String), isIn: expect.any(String), typeStr: 'string', limits: expect.anything() },
        { key: expect.any(String), isIn: expect.any(String), typeStr: 'string', limits: expect.anything() },
      ])
  })
  it('calculate array limits', () => {
    expect(formSettingsToValidate({ a: { type: ['9','four'] }, b: { type: ['null','option','longOption'] } }, 'inTest'))
      .toEqual([
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: { min: 1, max: 4 } },
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: { min: 4, max: 10 } },
      ])
  })
  it('calculate array limits converts to String', () => {
    expect(formSettingsToValidate({ a: { type: [9,'four'] }, b: { type: [null,'option','longOption'] } }, 'inTest'))
      .toEqual([
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: { min: 1, max: 4 } },
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: { min: 4, max: 10 } },
      ])
  })
  it('empty array limits', () => {
    expect(formSettingsToValidate({ a: { type: 'text' }, b: { type: [] } }, 'inTest'))
      .toEqual([
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: false },
        { key: expect.any(String), isIn: expect.any(String), typeStr: expect.any(String), limits: 0 },
      ])
  })
})

// Check custom Bool validator/sanitizer
describe('isBoolean', () => {
  it('succeeds on booleans', () => {
    expect(isBoolean(true)).toBe(true)
    expect(isBoolean(false)).toBe(true)
  })
  it('succeeds on boolean strings', () => {
    expect(isBoolean('true')).toBe(true)
    expect(isBoolean('false')).toBe(true)
    expect(isBoolean('')).toBe(true)
  })
  it('succeeds on 0/1 ints', () => {
    expect(isBoolean(0)).toBe(true)
    expect(isBoolean(1)).toBe(true)
  })
  it('succeeds on 0/1 strings', () => {
    expect(isBoolean('0')).toBe(true)
    expect(isBoolean('1')).toBe(true)
  })
  it('succeeds on other boolean strings', () => {
    expect(isBoolean('yes')).toBe(true)
    expect(isBoolean('no')).toBe(true)
    expect(isBoolean('on')).toBe(true)
    expect(isBoolean('off')).toBe(true)
  })
  it('fails on non-boolean strings', () => {
    expect(isBoolean('truthy')).toBe(false)
    expect(isBoolean('a')).toBe(false)
    expect(isBoolean('TEST')).toBe(false)
  })
  it('fails on non-boolean types', () => {
    expect(isBoolean({ test: true })).toBe(false)
    expect(isBoolean([ 1, 2, 3 ])).toBe(false)
    expect(isBoolean(null)).toBe(false)
    expect(isBoolean(undefined)).toBe(false)
  })
  it('check loose matches', () => {
    expect(isBoolean('FALSE')).toBe(looseBools)
    expect(isBoolean('ofF')).toBe(looseBools)
    expect(isBoolean(12)).toBe(looseBools)
  })
})
describe('parseBoolean', () => {
  it('parses booleans', () => {
    expect(parseBoolean(true)).toBe(true)
    expect(parseBoolean(false)).toBe(false)
  })
  it('parses boolean strings', () => {
    expect(parseBoolean('true')).toBe(true)
    expect(parseBoolean('false')).toBe(false)
    expect(parseBoolean('')).toBe(false)
  })
  it('parses 0/1 ints', () => {
    expect(parseBoolean(0)).toBe(false)
    expect(parseBoolean(1)).toBe(true)
  })
  it('parses 0/1 strings', () => {
    expect(parseBoolean('0')).toBe(false)
    expect(parseBoolean('1')).toBe(true)
  })
  it('parses other boolean strings', () => {
    expect(parseBoolean('yes')).toBe(true)
    expect(parseBoolean('no')).toBe(false)
    expect(parseBoolean('on')).toBe(true)
    expect(parseBoolean('off')).toBe(false)
  })
  it('parses non-boolean strings', () => {
    expect(parseBoolean('truthy')).toBe(true)
    expect(parseBoolean('a')).toBe(true)
    expect(parseBoolean('TEST')).toBe(true)
  })
  it('parses non-boolean types', () => {
    expect(parseBoolean({ test: true })).toBe(true)
    expect(parseBoolean([ 1, 2, 3 ])).toBe(true)
    expect(parseBoolean(12)).toBe(true)
  })
  it('parses loose matches', () => {
    expect(parseBoolean('FALSE')).toBe(!looseBools)
    expect(parseBoolean('ofF')).toBe(!looseBools)
    expect(parseBoolean(null)).toBe(!looseBools)
    expect(parseBoolean(undefined)).toBe(!looseBools)
  })
})

describe('dateOptions', () => {
  it('hasDate', () => { expect(dateOptions).toHaveProperty('date') })
  it('hasTime', () => { expect(dateOptions).toHaveProperty('time') })
})

describe('deepUnescape', () => {
  it('calls unescaper', () => {
    deepUnescape('TEST')
    expect(unescSpy).toBeCalledTimes(1)
    expect(unescSpy).toBeCalledWith('TEST')
  })
  it('skips non-strings', () => {
    deepUnescape(12)
    expect(unescSpy).toBeCalledTimes(0)
    deepUnescape(false)
    expect(unescSpy).toBeCalledTimes(0)
    deepUnescape(null)
    expect(unescSpy).toBeCalledTimes(0)
  })
  it('calls for each array string', () => {
    deepUnescape(['a','b','c','d'])
    expect(unescSpy).toBeCalledTimes(4)
    expect(unescSpy.mock.calls).toEqual([['a'],['b'],['c'],['d']])
    unescSpy.mockClear()
    deepUnescape(['a',undefined,'c',false,6])
    expect(unescSpy).toBeCalledTimes(2)
    expect(unescSpy.mock.calls).toEqual([['a'],['c']])
  })
  it('calls on nested arrays', () => {
    deepUnescape(['a',[['b','c'],'d']])
    expect(unescSpy).toBeCalledTimes(4)
    expect(unescSpy.mock.calls).toEqual([['a'],['b'],['c'],['d']])
  })
  it('calls for each object string value', () => {
    deepUnescape({ a: 'test', b: 'val', c: 'esc' })
    expect(unescSpy).toBeCalledTimes(3)
    expect(unescSpy.mock.calls).toEqual([['test'],['val'],['esc']])
    unescSpy.mockClear()
    deepUnescape({ a: 'test', b: 12, c: 'val', d: null })
    expect(unescSpy).toBeCalledTimes(2)
    expect(unescSpy.mock.calls).toEqual([['test'],['val']])
  })
  it('calls on nested objects', () => {
    deepUnescape({ a: 'test', b: { in: 'val', more: { c: 'esc' }}})
    expect(unescSpy).toBeCalledTimes(3)
    expect(unescSpy.mock.calls).toEqual([['test'],['val'],['esc']])
  })
  it('calls on nested arrays/objects', () => {
    deepUnescape([{ a: 'test', b: [ 'val', { c: 'esc' } ]}, {}])
    expect(unescSpy).toBeCalledTimes(3)
    expect(unescSpy.mock.calls).toEqual([['test'],['val'],['esc']])
  })
  it('mutates obj', () => {
    unescSpy.mockImplementationOnce(() => 'UNESC')
    const input = { a: 1, b: [2, { c: 'ESC', d: 4 }] }
    const output = deepUnescape(input)
    expect(output).toBe(input)
    expect(output).toEqual({ a: 1, b: [2, { c: 'UNESC', d: 4 }] })
  })
  it('mutates array', () => {
    unescSpy.mockImplementationOnce(() => 'UNESC')
    const input = [ 1, [2, { a: 'ESC', b: 4 }] ]
    const output = deepUnescape(input)
    expect(output).toBe(input)
    expect(output).toEqual([ 1, [2, { a: 'UNESC', b: 4 }] ])
  })
})

// Check escapedLength accurately counts length of escaped string
//   ex: '&' =esc=> '&amp;' ('amp' has max length of 5)
describe('escapedLength', () => {
  const returnVal = escapedLength({ options: { min: 1, max: 8 } }).options

  it('passes errorMessage', () => {
    expect(escapedLength({errorMessage: 'test'})).toHaveProperty('errorMessage', 'test')
  })
  it('true on no options', () => {
    expect(escapedLength({options: {}}).options('test')).toBe(true)
    expect(escapedLength({           }).options('test')).toBe(true)
    expect(escapedLength({options: {}}).options(1     )).toBe(true)
    expect(escapedLength({           }).options(1     )).toBe(true)
    expect(escapedLength({options: {}}).options(      )).toBe(true)
    expect(escapedLength({           }).options(      )).toBe(true)
  })
  it('false on non-string', () => {
    expect(returnVal()).toBe(false)
    expect(returnVal(1)).toBe(false)
    expect(returnVal([])).toBe(false)
    expect(returnVal({})).toBe(false)
  })
  it('works w/ standard string', () => {
    expect(returnVal('')).toBe(false)
    expect(returnVal('t')).toBe(true)
    expect(returnVal('test')).toBe(true)
    expect(returnVal('test str')).toBe(true)
    expect(returnVal('long test')).toBe(false)
    expect(returnVal('very long test')).toBe(false)
  })
  it('works w/ unescaped string', () => {
    expect(returnVal('&')).toBe(true)
    expect(returnVal('&<>"')).toBe(true)
    expect(returnVal('"<&! />"')).toBe(true)
    expect(returnVal('"<&! />"\'')).toBe(false)
    expect(returnVal('"<test! & />"')).toBe(false)
  })
  it('works w/ escaped string', () => {
    expect(returnVal(validator.escape('&'))).toBe(true)
    expect(returnVal(validator.escape('&<>"'))).toBe(true)
    expect(returnVal(validator.escape('"<&! />"'))).toBe(true)
    expect(returnVal(validator.escape('"<&! />"\''))).toBe(false)
    expect(returnVal(validator.escape('"<test! & />"'))).toBe(false)
  })
  it('works w/ edge cases', () => {
    expect(returnVal('&#amps;&#amps;')).toBe(true)
    expect(returnVal('test &#amps;st')).toBe(true)
    expect(returnVal('t&st st&#amps;')).toBe(true)
    expect(returnVal('test &; &')).toBe(true)
    expect(returnVal('test &; &1')).toBe(false)
    expect(returnVal('&toolong;')).toBe(false)
    expect(returnVal('&too long')).toBe(false)
  })
})
