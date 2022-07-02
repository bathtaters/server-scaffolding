const { getMaxEntry, getAllLevels, formatFileLog } = require('../../utils/log.utils')

describe('getMaxEntry', () => {
  it('gets max value', () => {
    expect(getMaxEntry({ a:  1, b: 2, c:  3 })[1]).toBe(3)
    expect(getMaxEntry({ a:  5, b: 2, c:  3 })[1]).toBe(5)
    expect(getMaxEntry({ a: -1, b: 0, c: -3 })[1]).toBe(0)
  })
  it('gets max key', () => {
    expect(getMaxEntry({ a:  1, b: 2, c:  3 })[0]).toBe('c')
    expect(getMaxEntry({ a:  5, b: 2, c:  3 })[0]).toBe('a')
    expect(getMaxEntry({ a: -1, b: 0, c: -3 })[0]).toBe('b')
  })
  it('returns falsy on empty input', () => {
    expect(getMaxEntry({})[0]).toBeFalsy()
  })
})

describe('getAllLevels', () => {
  it('gets all level vals', () => {
    expect(getAllLevels([{ level: 'a' },{ level: 'b' },{ level: 'c' }]))
      .toEqual(['a','b','c'])
  })
  it('skips missing level vals', () => {
    expect(getAllLevels([{ level: 'a' },{ other: 'b' },{ level: 'c' },null]))
      .toEqual(['a','c'])
  })
  it('skips duplicate level vals', () => {
    expect(getAllLevels([{ level: 'a' },{ level: 'b' },{ level: 'a' }]))
      .toEqual(['a','b'])
  })
})

describe('formatFileLog', () => {
  it('parses JSON string', () => {
    expect(formatFileLog('{"a":1}')).toEqual({ a: 1 })
  })
  it('passes falsy val', () => {
    expect(formatFileLog('')).toBeFalsy()
  })
  it('gets full/short times', () => {
    expect(formatFileLog('{"timestamp": false}').timestamp).toEqual({
      full: expect.any(String),
      short: expect.any(String),
    })
  })
})