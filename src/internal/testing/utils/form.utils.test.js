const { actions } = require('../../../config/gui.cfg')
const { profileLabels, labelsByAccess, filterFormData, toQueryString } = require('../../utils/form.utils')
jest.mock('../../utils/validate.utils', () => ({ parseBoolean: () => () => 'parsed' }))

describe('profileLabels', () => {
  it('is string array', () => {
    expect(Array.isArray(profileLabels)).toBeTruthy()
    profileLabels.forEach((label) => expect(typeof label).toBe('string'))
  })
})

describe('labelsByAccess', () => {
  it('gets all vals', () => {
    expect(labelsByAccess(['read','write'])).toEqual(Object.values(actions))
  })
  it('gets read-only vals', () => {
    expect(labelsByAccess(['read'])).toEqual([actions.find])
  })
  it('gets write-only vals', () => {
    expect(labelsByAccess(['write'])).toEqual([actions.create, actions.update, actions.delete, actions.clear])
  })
  it('gets no vals w/o read/write', () => {
    expect(labelsByAccess(['other'])).toEqual([])
    expect(labelsByAccess([])).toEqual([])
  })
})

describe('filterFormData', () => {
  it('default filter removes null values', () => {
    expect(filterFormData({ a: 1, b: null, c: 3 })).toEqual({ a: 1, c: 3 })
    expect(filterFormData({ a: 1, b: 2, c: undefined })).toEqual({ a: 1, b: 2 })
  })
  it('default filter removes empty strings', () => {
    expect(filterFormData({ a: 1, b: '', c: 3 })).toEqual({ a: 1, c: 3 })
    expect(filterFormData({ a: 1, b: 2, c: '', d: '' })).toEqual({ a: 1, b: 2 })
  })
  it('force includes boolFields', () => {
    expect(filterFormData({ a: 1 }, ['b','c'])).toEqual({ a: 1, b: false, c: false })
  })
  it('runs boolFields through parseBool', () => {
    expect(filterFormData({ a: 1, b: 0, c: true }, ['b','c','d']))
      .toMatchObject({ a: 1, b: 'parsed', c: 'parsed', })
  })
  it('allows custom filter', () => {
    expect(filterFormData({ a: 1, b: 2, c: 3 }, [], (val) => val !== 2))
      .toEqual({ a: 1, c: 3 })
    expect(filterFormData({ a: 1, b: 2, c: 3 }, [], (val,key) => key !== 'c'))
      .toEqual({ a: 1, b: 2 })
  })
})

describe('toQueryString', () => {
  const ignoreFilter = () => true

  it('converts object to query string', () => {
    expect(toQueryString({ test: 'str' }, ignoreFilter)).toBe('?test=str')
    expect(toQueryString({ a: 1, b: 2 }, ignoreFilter)).toBe('?a=1&b=2')
  })
  it('returns empty string if no keys', () => {
    expect(toQueryString()).toBe('')
    expect(toQueryString('')).toBe('')
    expect(toQueryString(null)).toBe('')
    expect(toQueryString({})).toBe('')
  })
  it('converts stringified JSON to object', () => {
    expect(toQueryString('{"test":"str"}', ignoreFilter)).toBe('?test=str')
    expect(toQueryString('{"a":1,"b":2}', ignoreFilter)).toBe('?a=1&b=2')
  })
  it('allows custom filter', () => {
    expect(toQueryString({ a: 1, b: 2, c: 3 }, (val) => val !== 2))
      .toBe('?a=1&c=3')
    expect(toQueryString({ a: 1, b: 2, c: 3 }, (val,key) => key !== 'c'))
      .toBe('?a=1&b=2')
  })
  it('default filter removes null values', () => {
    expect(toQueryString({ a: 1, b: null, c: 3 })).toBe('?a=1&c=3')
    expect(toQueryString({ a: 1, b: 2, c: undefined })).toBe('?a=1&b=2')
  })
  it('default filter removes empty strings', () => {
    expect(toQueryString({ a: 1, b: '', c: 3 })).toBe('?a=1&c=3')
    expect(toQueryString({ a: 1, b: 2, c: '', d: '' })).toBe('?a=1&b=2')
  })
})