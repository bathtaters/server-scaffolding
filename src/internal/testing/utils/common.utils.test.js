const { capitalizeHyphenated, filterDupes, hasDupes, notRoute, getMatchingKey, caseInsensitiveObject } = require('../../utils/common.utils')

describe('capitalizeHyphenated', () => {
  it('capitalizes first letter', () => {
    expect(capitalizeHyphenated('test')).toBe('Test')
  })
  it('spaces + capitalizes after hyphen', () => {
    expect(capitalizeHyphenated('test-word')).toBe('Test Word')
  })
})

describe('filterDupes', () => {
  it('ignores non-dupes', () => {
    expect(filterDupes([])).toEqual([])
    expect(filterDupes([1, 2, 3])).toEqual([1, 2, 3])
    expect(filterDupes(['t', 'T', 'test'])).toEqual(['t', 'T', 'test'])
  })
  it('removes duped values', () => {
    expect(filterDupes([1, 2, 3, 2, 1, 4, 4])).toEqual([1, 2, 3, 4])
    expect(filterDupes(['t', 'T', 't', 'test', 'T'])).toEqual(['t','T','test'])
  })
})

describe('hasDupes', () => {
  it('false', () => {
    expect(hasDupes([])).toBe(false)
    expect(hasDupes([1, 2, 3])).toBe(false)
    expect(hasDupes(['t', 'T', 'test'])).toBe(false)
  })
  it('true', () => {
    expect(hasDupes([1, 2, 3, 2, 1, 4, 4])).toBe(true)
    expect(hasDupes(['t', 'T', 't', 'test', 'T'])).toBe(true)
  })
})

describe('notRoute', () => {
  it('creates RegEx that matches everything but input[/...]', () => {
    expect(notRoute('test').test('test')).toBe(false)
    expect(notRoute('test').test('test/')).toBe(false)
    expect(notRoute('test').test('test/test')).toBe(false)
    expect(notRoute('test').test('TEST')).toBe(true)
    expect(notRoute('test').test('t')).toBe(true)
    expect(notRoute('test').test('testtest')).toBe(true)
    expect(notRoute('test').test('')).toBe(true)
  })
})

describe('getMatchingKey', () => {
 it('gets exact key', () => {
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'test')).toBe('test')
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'other')).toBe('other')
 })
 it('gets case-insensitive key', () => {
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'TeSt')).toBe('test')
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'OTHER')).toBe('other')
 })
 it('returns undefined when only partial match', () => {
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'tes')).toBeUndefined()
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'otherKey')).toBeUndefined()
 })
 it('returns undefined when missing key', () => {
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'missing')).toBeUndefined()
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'newKey')).toBeUndefined()
 })
})

describe('caseInsensitiveObject', () => {
  let baseObj
  beforeEach(() => { baseObj = { a: 1, B: 2, TeSt: 'data' } })

  it('returns identical copy of object', () => {
    expect(caseInsensitiveObject(baseObj)).toEqual({ a: 1, B: 2, TeSt: 'data' })
    expect(caseInsensitiveObject(baseObj)).not.toBe(baseObj)
  })
  it('case-insensitive get', () => {
    expect(caseInsensitiveObject(baseObj).a   ).toBe(1)
    expect(caseInsensitiveObject(baseObj).b   ).toBe(2)
    expect(caseInsensitiveObject(baseObj).test).toBe('data')
    expect(caseInsensitiveObject(baseObj).TEST).toBe('data')
  })
  it('case-insensitive has', () => {
    expect('a'    in caseInsensitiveObject(baseObj)).toBeTruthy()
    expect('b'    in caseInsensitiveObject(baseObj)).toBeTruthy()
    expect('test' in caseInsensitiveObject(baseObj)).toBeTruthy()
    expect('TEST' in caseInsensitiveObject(baseObj)).toBeTruthy()
  })
  it('case-insensitive set', () => {
    const testObj = caseInsensitiveObject(baseObj)
    testObj.a = 11
    testObj.b = 62
    testObj.test = 'temp'
    testObj.TEST = 'new'
    testObj.C = 100
    expect(testObj).toEqual({ a: 11, B: 62, TeSt: 'new', C: 100 })
  })
  it('case-insensitive delete', () => {
    const testObj = caseInsensitiveObject(baseObj)
    delete testObj.A
    delete testObj.test
    expect(testObj).toEqual({ B: 2 })
  })
})