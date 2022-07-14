const { capitalizeHyphenated, filterDupes, hasDupes, notRoute, getMatchingKey } = require('../../utils/common.utils')

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
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'test')).toBe('match')
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'other')).toBe('alt')
 })
 it('gets case-insensitive key', () => {
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'TeSt')).toBe('match')
  expect(getMatchingKey({ test: 'match', other: 'alt' }, 'OTHER')).toBe('alt')
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