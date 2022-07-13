const { capitalizeHyphenated, filterDupes, hasDupes, notRoute } = require('../../utils/common.utils')

it.todo('getMatchingKey')

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