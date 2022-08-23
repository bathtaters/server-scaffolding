const { checkInjection, extractId, appendAndSort } = require('../../utils/db.utils')
const errors = require('../../config/errors.engine')

describe('checkInjection', () => {
  it('throws error when matches illegalKeyName', () => {
    expect(() => checkInjection('Test.ILLEGAL!'))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!', false))
  })
  it('throws error when is in illegalKeys (case insensitive)', () => {
    expect(() => checkInjection('bad'))
      .toThrowError(errors.sqlInjection('bad', true))
  })
  it('throws error when illegal type', () => {
    expect(() => checkInjection(1234)).toThrowError(errors.sqlInjection(1234, false))
    expect(() => checkInjection(() => {})).toThrowError(errors.sqlInjection(() => {}, false))
  })
  it('deep checks arrays', () => {
    expect(() => checkInjection(['a','b',['c',['Test.ILLEGAL!']]]))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!', false))
  })
  it('checks only object keys', () => {
    expect(() => checkInjection({ a: 1, b: 2, c: 3, d: 'Test.ILLEGAL!' })).not.toThrow()
    expect(() => checkInjection({ a: 1, b: 2, c: 3, 'Test.ILLEGAL!': 4 }))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!', false))
  })
  it('returns value when not illegal', () => {
    expect(checkInjection('Test')).toBe('Test')
    expect(checkInjection('ANYTHING!')).toBe('ANYTHING!')
    const testArr = checkInjection(['a','b',['c',['d']]])
    expect(testArr).toBe(testArr)
    expect(testArr).toEqual(['a','b',['c',['d']]])
    const testObj = checkInjection({ a: 1, b: 2, c: 3, d: 4 })
    expect(testObj).toBe(testObj)
    expect(testObj).toEqual({ a: 1, b: 2, c: 3, d: 4 })
  })
  it('passes falsy values', () => {
    expect(checkInjection('')).toBe('')
    expect(checkInjection(0)).toBe(0)
    expect(checkInjection(false)).toBe(false)
    expect(checkInjection()).toBeUndefined()
  })
  it('passes tableName to error', () => {
    expect(() => checkInjection('Test.ILLEGAL!','tableName'))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!',false,'tableName'))
    expect(() => checkInjection(['a','b',['c',['Test.ILLEGAL!']]],'tableName'))
      .toThrowError(errors.sqlInjection('Test.ILLEGAL!',false,'tableName'))
  })
})

describe('extractId', () => {
  it('returns ID', () => {
    expect(extractId({ a: 1, b: 2 }, 'a')[0]).toBe(1)
    expect(extractId({ a: 1, b: 2 }, 'b')[0]).toBe(2)
  })
  it('returns data without ID', () => {
    expect(extractId({ a: 1, b: 2 }, 'a')[1]).toEqual({ b: 2 })
    expect(extractId({ a: 1, b: 2 }, 'b')[1]).toEqual({ a: 1 })
  })
})

describe('appendAndSort', () => {
  it('appends missing value', () => {
    expect(appendAndSort([1,2,3], 4).filter((n) => n === 4)).toHaveLength(1)
  })
  it('doesn\'t add missing value', () => {
    expect(appendAndSort([1,2,3], 3).filter((n) => n === 3)).toHaveLength(1)
  })
  it('sorts in numerical order', () => {
    expect(appendAndSort([82,4,-678,135,-12,])).toEqual([-678,-12,4,82,135])
    expect(appendAndSort([82,4,-12,], 13)).toEqual([-12,4,13,82])
  })
})


jest.mock('../../config/validate.cfg', () => ({ illegalKeyName: /ILLEGAL/, illegalKeys: ['BAD'] }))
jest.mock('../../utils/validate.utils', () => ({
  parseTypeStr: jest.fn((type) => ({ type, isOptional: true })),
  parseArray: () => (arr) => arr.split('|'),
  parseBoolean: () => (bool) => typeof bool !== 'boolean' ? bool === 'TEST' : bool,
}))