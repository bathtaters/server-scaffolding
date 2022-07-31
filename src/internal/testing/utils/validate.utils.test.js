const { 
  parseTypeStr, formSettingsToValidate,
  isBoolean, parseBoolean,
} = require('../../utils/validate.utils')

describe('parseTypeStr', () => {
  it('nothing', () => {
    expect(parseTypeStr()).toEqual({})
    expect(parseTypeStr('')).toEqual({})
    expect(parseTypeStr('test*[]?test')).toEqual({})
  })
  it('.string = input', () => {
    expect(parseTypeStr('test').string).toBe('test')
    expect(parseTypeStr('test*[]?').string).toBe('test*[]?')
  })
  it('.type = typeStr', () => {
    expect(parseTypeStr('test').type).toBe('test')
    expect(parseTypeStr('test*[]?').type).toBe('test')
  })
  it('.isOptional = isOptional', () => {
    expect(parseTypeStr('test').isOptional).toBe(false)
    expect(parseTypeStr('test?').isOptional).toBe(true)
    expect(parseTypeStr('test*[]').isOptional).toBe(false)
    expect(parseTypeStr('test*[]?').isOptional).toBe(true)
    expect(parseTypeStr('test*?[]').isOptional).toBe(true)
    expect(parseTypeStr('test?*[]').isOptional).toBe(true)
  })
  it('.isArray = isArray', () => {
    expect(parseTypeStr('test').isArray).toBe(false)
    expect(parseTypeStr('test[]').isArray).toBe(true)
    expect(parseTypeStr('test*?').isArray).toBe(false)
    expect(parseTypeStr('test[]*?').isArray).toBe(true)
    expect(parseTypeStr('test*[]?').isArray).toBe(true)
    expect(parseTypeStr('test*?[]').isArray).toBe(true)
  })
  it('.hasSpaces = leaveWhiteSpace', () => {
    expect(parseTypeStr('test').hasSpaces).toBe(false)
    expect(parseTypeStr('test*').hasSpaces).toBe(true)
    expect(parseTypeStr('test[]?').hasSpaces).toBe(false)
    expect(parseTypeStr('test*[]?').hasSpaces).toBe(true)
    expect(parseTypeStr('test[]*?').hasSpaces).toBe(true)
    expect(parseTypeStr('test[]?*').hasSpaces).toBe(true)
  })
})

describe('formSettingsToValidate', () => {
  it('format for byObject', () => {
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
  const isBoolStrict = isBoolean(false)
  const isBoolLoose = isBoolean(true)

  it('strict only succeeds for boolOpts.true/false', () => {
    expect(isBoolStrict(21)).toBe(true)
    expect(isBoolStrict(12)).toBe(true)
    expect(isBoolStrict('testTrue')).toBe(true)
    expect(isBoolStrict('testFalse')).toBe(true)
    expect(isBoolStrict('otherTrue')).toBe(true)
    expect(isBoolStrict('otherFalse')).toBe(true)
    expect(isBoolStrict(0)).toBe(false)
    expect(isBoolStrict(2)).toBe(false)
    expect(isBoolStrict(210)).toBe(false)
    expect(isBoolStrict(-12)).toBe(false)
    expect(isBoolStrict('testTrue2')).toBe(false)
    expect(isBoolStrict('otherFals')).toBe(false)
    expect(isBoolStrict('notIncluded')).toBe(false)
    expect(isBoolLoose('true')).toBe(false)
    expect(isBoolLoose('false')).toBe(false)
    expect(isBoolStrict(true)).toBe(false)
    expect(isBoolStrict(false)).toBe(false)
  })
  it('loose succeeds if string in boolOpts.true/false', () => {
    expect(isBoolLoose('testTrue')).toBe(true)
    expect(isBoolLoose('testFalse')).toBe(true)
    expect(isBoolLoose('otherTrue')).toBe(true)
    expect(isBoolLoose('otherFalse')).toBe(true)
    expect(isBoolLoose('testTrue2')).toBe(false)
    expect(isBoolLoose('otherFals')).toBe(false)
    expect(isBoolLoose('notIncluded')).toBe(false)
    expect(isBoolLoose('true')).toBe(false)
    expect(isBoolLoose('false')).toBe(false)
  })
  it('loose succeeds if val type in boolOpts.types', () => {
    expect(isBoolLoose(21)).toBe(true)
    expect(isBoolLoose(1)).toBe(true)
    expect(isBoolLoose(-123)).toBe(true)
    expect(isBoolLoose(12345)).toBe(true)
    expect(isBoolLoose(() => {})).toBe(false)
    expect(isBoolLoose({ a: 1 })).toBe(false)
    expect(isBoolLoose([ 1, 2, 3 ])).toBe(false)
    expect(isBoolLoose()).toBe(false)
    expect(isBoolLoose(null)).toBe(false)
    expect(isBoolLoose(12n)).toBe(false)
    expect(isBoolLoose(true)).toBe(false)
    expect(isBoolLoose(false)).toBe(false)
  })
})
describe('parseBoolean', () => {
  const parseStrict = parseBoolean(false)
  const parseLoose = parseBoolean(true)

  it('strict converts boolOpts.false to false', () => {
    expect(parseStrict(12)).toBe(false)
    expect(parseStrict('testFalse')).toBe(false)
    expect(parseStrict('otherFalse')).toBe(false)
  })
  it('strict converts boolOpts.true to true', () => {
    expect(parseStrict(21)).toBe(true)
    expect(parseStrict('testTrue')).toBe(true)
    expect(parseStrict('otherTrue')).toBe(true)
  })
  it('strict fallsback to true', () => {
    expect(parseStrict('')).toBe(true)
    expect(parseStrict('otherFals')).toBe(true)
    expect(parseStrict('testFalseA')).toBe(true)
    expect(parseStrict('anyOtherString...')).toBe(true)
    expect(parseStrict(1)).toBe(true)
    expect(parseStrict(-123)).toBe(true)
    expect(parseStrict(12345)).toBe(true)
    expect(parseStrict(() => {})).toBe(true)
    expect(parseStrict({ a: 1 })).toBe(true)
    expect(parseStrict([ 1, 2, 3 ])).toBe(true)
    expect(parseStrict()).toBe(true)
    expect(parseStrict(null)).toBe(true)
    expect(parseStrict(12n)).toBe(true)
    expect(parseStrict(true)).toBe(true)
    expect(parseStrict(false)).toBe(true)
  })
  it('loose converts boolOpts.false strings to false', () => {
    expect(parseLoose('testFalse')).toBe(false)
    expect(parseLoose('otherFalse')).toBe(false)
  })
  it('loose converts boolOpts.true to true', () => {
    expect(parseLoose('testTrue')).toBe(true)
    expect(parseLoose('otherTrue')).toBe(true)
  })
  it('loose is case-insensitive', () => {
    expect(parseLoose('TESTTRUE')).toBe(true)
    expect(parseLoose('testFALSE')).toBe(false)
    expect(parseLoose('OtHerTRuE')).toBe(true)
    expect(parseLoose('otherfalse')).toBe(false)
  })
  it('loose uses Boolean() for non-strings', () => {
    expect(parseLoose(0)).toBe(false)
    expect(parseLoose(12)).toBe(true)
    expect(parseLoose(-123)).toBe(true)
    expect(parseLoose(12345)).toBe(true)
    expect(parseLoose(() => {})).toBe(true)
    expect(parseLoose({})).toBe(true)
    expect(parseLoose({ a: 1 })).toBe(true)
    expect(parseLoose([])).toBe(true)
    expect(parseLoose()).toBe(false)
    expect(parseLoose(null)).toBe(false)
    expect(parseLoose(0n)).toBe(false)
    expect(parseLoose(12n)).toBe(true)
    expect(parseLoose(true)).toBe(true)
    expect(parseLoose(false)).toBe(false)
  })
})


// MOCKS

jest.mock('../../libs/regex', () => (re) => re)
jest.mock('../../config/validate.cfg', () => ({
  boolOptions: {
    true:  [21, 'testTrue',  'otherTrue'],
    false: [12, 'testFalse', 'otherFalse'],
    types: ['string', 'number'],
    loose: true,
  },
}))