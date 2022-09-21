const validateUtils = require('../../utils/validate.utils')
const { 
  formSettingsToValidate,
  isBoolean, parseBoolean,
  parseArray, toArraySchema,
} = validateUtils

describe('formSettingsToValidate', () => {
  it('format for byObject', () => {
    expect(formSettingsToValidate({
      a: { html: { type: 'text', limits: 'limitsA' } },
      b: { html: { type: 'number', limits: 'limitsB' } }
    })).toEqual({
      a: { typeStr: expect.any(String), limits: expect.anything() },
      b: { typeStr: expect.any(String), limits: expect.anything() },
    })
  })
  it('pass limits', () => {
    expect(formSettingsToValidate({
      a: { html: { type: 'text', limits: 'limitsA' } },
      b: { html: { type: 'number', limits: 'limitsB' } }
    })).toEqual({
      a: { typeStr: expect.any(String), limits: 'limitsA' },
      b: { typeStr: expect.any(String), limits: 'limitsB' },
    })
  })
  it('number => int', () => {
    expect(formSettingsToValidate({
      a: { html: { type: 'text', limits: 'limitsA' } },
      b: { html: { type: 'number', limits: 'limitsB' } }
    })).toEqual({
      a: { typeStr: expect.any(String), limits: expect.anything() },
      b: { typeStr: 'int', limits: expect.anything() },
    })
  })
  it('else/array => string', () => {
    expect(formSettingsToValidate({
      a: { html: { type: 'text', limits: 'limitsA' } },
      b: { html: { type: ['op','option','longOption'], limits: 'limitsB' } } 
    })).toEqual({
      a: { typeStr: 'string', limits: expect.anything() },
      b: { typeStr: 'string', limits: expect.anything() },
    })
  })
  it('calculate array limits', () => {
    expect(formSettingsToValidate({
      a: { html: { type: ['9','four'] } },
      b: { html: { type: ['null','option','longOption'] } } 
    })).toEqual({
      a: { typeStr: expect.any(String), limits: { min: 1, max: 4 } },
      b: { typeStr: expect.any(String), limits: { min: 4, max: 10 } },
    })
  })
  it('calculate array limits converts to String', () => {
    expect(formSettingsToValidate({
      a: { html: { type: [9,'four'] } },
      b: { html: { type: [null,'option','longOption'] } } 
    })).toEqual({
      a: { typeStr: expect.any(String), limits: { min: 1, max: 4 } },
      b: { typeStr: expect.any(String), limits: { min: 4, max: 10 } },
    })
  })
  it('empty array limits', () => {
    expect(formSettingsToValidate({
      a: { html: { type: 'text' } },
      b: { html: { type: [] } }
    })).toEqual({
      a: { typeStr: expect.any(String), limits: false },
      b: { typeStr: expect.any(String), limits: 0 },
    })
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

describe('parseArray', () => {
  it('uses splitUnenclosed', () => {
    expect(parseArray()('TEST')).toBe('SPLIT_UNENC')
  })

  describe('optional = true', () => {
    const parser = parseArray(true)
    it('empty string/null/undef', () => {
      expect(parser('')).toBe('')
      expect(parser(null)).toBeNull()
      expect(parser()).toBeUndefined()
    })
    it('enclosed array', () => {
      expect(parser('[1,2,3]')).toEqual(['1','2','3'])
      expect(parser('["add","bad","cab"]')).toEqual(['"add"','"bad"','"cab"'])
    })
    it('comma-seperated list', () => {
      expect(parser('1,2,3')).toEqual(['1','2','3'])
      expect(parser('add,bad,cab')).toEqual(['add','bad','cab'])
    })
    it('array object', () => {
      expect(parser([1,2,3])).toEqual([1,2,3])
      expect(parser(['add','bad','cab'])).toEqual(['add','bad','cab'])
    })
    it('not a string', () => {
      expect(parser(123)).toEqual([123])
      expect(parser(true)).toEqual([true])
      expect(parser({ a: 1, b: 2, c: 3 })).toEqual([{ a: 1, b: 2, c: 3 }])
    })
  })
  describe('optional = false', () => {
    const parser = parseArray(false)
    it('empty string/null/undef', () => {
      expect(parser('')).toEqual([]) // always returns array if passed string
      expect(parser(null)).toEqual([]) // always returns array if passed string
      expect(parser()).toEqual([]) // always returns array if passed string
    })
    it('enclosed array', () => {
      expect(parser('[1,2,3]')).toEqual(['1','2','3'])
      expect(parser('["add","bad","cab"]')).toEqual(['"add"','"bad"','"cab"'])
    })
    it('comma-seperated list', () => {
      expect(parser('1,2,3')).toEqual(['1','2','3'])
      expect(parser('add,bad,cab')).toEqual(['add','bad','cab'])
    })
    it('array object', () => {
      expect(parser([1,2,3])).toEqual([1,2,3])
      expect(parser(['add','bad','cab'])).toEqual(['add','bad','cab'])
    })
    it('not a string', () => {
      expect(parser(123)).toEqual([123])
      expect(parser(true)).toEqual([true])
      expect(parser({ a: 1, b: 2, c: 3 })).toEqual([{ a: 1, b: 2, c: 3 }])
    })
  })
})

describe('toArraySchema', () => {
  const parserSpy = jest.spyOn(validateUtils, 'parseArray')
  it('Only returns entries w/ "toArray"', () => {
    expect(Object.keys(toArraySchema({
      a: { test: true }, b: { toArray: true },
      c: { toArray: false }, d: { test: false }, 
    }))).toEqual(['b', 'c'])
  })
  it('Copies "in" value from input', () => {
    expect(toArraySchema({
      a: { toArray: true, in: 'A_IN_VAL' },
      b: { toArray: true, in: 'B_IN_VAL' },
    })).toEqual({
      a: expect.objectContaining({ in: 'A_IN_VAL' }),
      b: expect.objectContaining({ in: 'B_IN_VAL' }),
    })
  })
  it('Sets "customSanitizer" to parseArray', () => {
    parserSpy.mockReturnValueOnce('PARSE_ARRAY').mockReturnValueOnce('PARSE_ARRAY')
    expect(toArraySchema({ a: { toArray: true }, b: { toArray: true } })).toEqual({
      a: expect.objectContaining({ customSanitizer: { options: 'PARSE_ARRAY' } }),
      b: expect.objectContaining({ customSanitizer: { options: 'PARSE_ARRAY' } }),
    })
  })
  it('Constructs parseArray w/ "toArray" value', () => {
    toArraySchema({ a: { toArray: 'TO_ARR_A' }, b: { toArray: 'TO_ARR_B' } })
    expect(parserSpy).toBeCalledWith('TO_ARR_A')
    expect(parserSpy).toBeCalledWith('TO_ARR_B')
  })
  it('Deletes "toArray" from input', () => {
    const input = { a: { toArray: true, in: 'A' }, b: { toArray: true, in: 'B' } }
    toArraySchema(input)
    expect(input.a).not.toHaveProperty('toArray')
    expect(input.b).not.toHaveProperty('toArray')
  })
  it('Always returns object', () => {
    expect(toArraySchema({})).toEqual({})
    expect(toArraySchema({ a: {}, b: {} })).toEqual({})
    expect(toArraySchema({ a: { in: 'A' }, b: { in: 'B' } })).toEqual({})
  })
})


// MOCKS

jest.mock('../../libs/regex', () => (re) => re)
jest.mock('../../utils/common.utils', () => ({
  splitUnenclosed: (delim) => (str) => str !== 'TEST' ? str.split(delim) : 'SPLIT_UNENC'
}))
jest.mock('../../config/validate.cfg', () => ({
  boolOptions: {
    true:  [21, 'testTrue',  'otherTrue'],
    false: [12, 'testFalse', 'otherFalse'],
    types: ['string', 'number'],
    loose: true,
  },
}))