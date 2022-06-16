// Setup ESC/UNESC spies
const validator = require('validator').default
const unescSpy = jest.spyOn(validator, 'unescape')

// Imports
const { dateOptions, filterDupes, getTypeArray, escapedLength, deepUnescape } = require('../../utils/validate.utils')


describe('dateOptions', () => {
  it('hasDate', () => { expect(dateOptions).toHaveProperty('date') })
  it('hasTime', () => { expect(dateOptions).toHaveProperty('time') })
})

describe('filterDupes', () => {
  it('ignores non-dupes', () => {
    expect(filterDupes([])).toEqual([])
    expect(filterDupes([1, 2, 3])).toEqual([1, 2, 3])
    expect(filterDupes(['a', 'A', 'b'])).toEqual(['a', 'A', 'b'])
  })
  it('removes duped values', () => {
    expect(filterDupes([1, 2, 3, 2, 1, 4, 4])).toEqual([1, 2, 3, 4])
    expect(filterDupes(['a', 'A', 'a', 'b', 'a'])).toEqual(['a','A','b'])
  })
})

// Check getTypeArray (test*[]? => [test*[]?, test, *, [], ?])
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
