const { actions } = require(require('../../src.path').config+'gui.cfg')
const { profileLabels, actionAccess, labelsByAccess, actionURLs, filterFormData, toQueryString } = require('../../utils/form.utils')

describe('profileLabels', () => {
  it('is string array', () => {
    expect(Array.isArray(profileLabels)).toBeTruthy()
    profileLabels.forEach((label) => expect(typeof label).toBe('string'))
  })
})

describe('actionAccess', () => {
  it('Search is read-only', () => {
    expect(actionAccess('Search')).toBe('read')
  })
  it('Default is write-only', () => {
    expect(actionAccess('Add')).toBe('write')
    expect(actionAccess('Update')).toBe('write')
    expect(actionAccess('Remove')).toBe('write')
    expect(actionAccess('Reset')).toBe('write')
    expect(actionAccess('TESTTESTEST')).toBe('write')
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

describe('actionURLs', () => {
  it('includes entire actionList as keys', () => {
    expect(Object.keys(actionURLs('BASE/TEST/',['LinkA','LinkB','LinkC'])))
      .toEqual(['LinkA','LinkB','LinkC'])
  })
  it('each url is baseURL + action (lowercase)', () => {
    expect(actionURLs('BASE/TEST/',['LinkA','LinkB','LinkC'])).toEqual({
      LinkA: 'BASE/TEST/linka',
      LinkB: 'BASE/TEST/linkb',
      LinkC: 'BASE/TEST/linkc',
    })
  })
  it('defaults to use gui.cfg.actions (values)', () => {
    expect(Object.keys(actionURLs('BASE/TEST/'))).toEqual(Object.values(actions))
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
  it('force includes baseObject', () => {
    expect(filterFormData({ a: 1 }, { b: 2, c: 3 })).toEqual({ a: 1, b: 2, c: 3 })
  })
  it('runs baseObject fields through parseBool', () => {
    expect(filterFormData({ a: 1, b: 0, c: true }, { b: 2, c: 3, d: 4 }))
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

// MOCKS
jest.mock('../../utils/validate.utils', () => ({
  parseBoolean: () => () => 'parsed',
  parseArray: () => () => ['parsedA'],
}))