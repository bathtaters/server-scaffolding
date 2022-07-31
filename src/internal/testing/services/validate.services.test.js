const services = require('../../services/validate.services')
const { parseTypeStr } = require('../../utils/validate.utils')


describe('generateSchema', () => {
  const schemaSpy = jest.spyOn(services, 'toValidationSchema')

  beforeAll(() => { schemaSpy.mockImplementation(()=>{}) })
  // afterAll(() => { schemaSpy.mockRestore() })
  
  describe('input vars', () => {
    it('calls toValidationSchema', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', 'isIn', false, false)
      expect(schemaSpy).toBeCalledTimes(1)
    })
    it('passes key', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', 'isIn', false, false)
      expect(schemaSpy).toBeCalledWith(
        'NAME',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      )
    })
    it('passes typeStr', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', 'isIn', false, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        'TYPE',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      )
    })
    it('passes limits', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', 'isIn', false, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        'LIMITS',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      )
    })
    it('passes isIn', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', 'isIn', false, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'isIn',
        expect.anything(),
        expect.anything(),
      )
    })
    it('passes falsy optional', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', 'isIn', 0, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false,
        expect.anything(),
      )
    })
    it('passes disableMin', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', 'isIn', false, 'noMin')
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'noMin',
      )
    })
  })

  describe('optional = true', () => {
    it('isIn is "body"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['body'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true,
        expect.anything(),
      )
    })
    it('isIn is "query"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['query'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true,
        expect.anything(),
      )
    })
    it('isIn is "body" + "query"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['body','query'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true,
        expect.anything(),
      )
    })
    it('isIn contains "body"', () => {
      schemaSpy.mockClear()
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['isIn','body'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false,
        expect.anything(),
      )
    })
    it('isIn contains "query"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['isIn','query'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false,
        expect.anything(),
      )
    })
    it('isIn is empty', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', [], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false,
        expect.anything(),
      )
    })
  })

  describe('isIn filtered when optional = true', () => {
    it('isIn contains "body"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['isIn','body'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        ['isIn'],
        expect.anything(),
        expect.anything(),
      )
    })
    it('isIn contains "query"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['isIn','query'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        ['isIn'],
        expect.anything(),
        expect.anything(),
      )
    })
    it('isIn contains "body" & "query"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['query','isIn','body'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        ['isIn'],
        expect.anything(),
        expect.anything(),
      )
    })
    it('isIn does not contain "body" or "query"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['isInA','isInB'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        ['isInA','isInB'],
        expect.anything(),
        expect.anything(),
      )
    })
    it('isIn is "body"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['body'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        ['body'],
        expect.anything(),
        expect.anything(),
      )
    })
    it('isIn is "query"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['query'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        ['query'],
        expect.anything(),
        expect.anything(),
      )
    })
    it('isIn is exactly "body" and "query"', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', ['body','query'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        ['body','query'],
        expect.anything(),
        expect.anything(),
      )
    })
    it('isIn is empty', () => {
      services.generateSchema('NAME', 'TYPE', 'LIMITS', [], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        [],
        expect.anything(),
        expect.anything(),
      )
    })
  })
})


describe('appendToSchema', () => {
  const schemaSpy = jest.spyOn(services, 'toValidationSchema')
  beforeAll(() => { schemaSpy.mockImplementation((key,t,l,isIn) => ({ [key]: { in: isIn } })) })
  afterAll(() => { schemaSpy.mockRestore() })
  
  let schema, addit
  beforeEach(() => {
    schema = { a: { in: ['inA'] }, b: { in: ['inA','inB'] },  }
    addit = [
      { key: 'c', isIn: ['inC'], typeStr: 'TYPE_C', limits: 'LIMS_C', },
      { key: 'd', isIn: ['inC','inD'], typeStr: 'TYPE_D', limits: '', },
    ]
  })

  it('runs each entry through toValidationSchema', () => {
    services.appendToSchema(schema, addit)
    expect(schemaSpy).toBeCalledTimes(2)
    expect(schemaSpy).toBeCalledWith('c',expect.anything(),expect.anything(),expect.anything())
    expect(schemaSpy).toBeCalledWith('d',expect.anything(),expect.anything(),expect.anything())
  })
  it('passes entry options to toValidationSchema', () => {
    services.appendToSchema(schema, addit)
    expect(schemaSpy).toBeCalledWith('c', 'TYPE_C', 'LIMS_C', ['inC'])
    expect(schemaSpy).toBeCalledWith('d', 'TYPE_D', '', ['inC','inD'])
  })
  it('adds each toValidationSchema result to schema by key', () => {
    expect(services.appendToSchema(schema, addit)).toEqual({
      a: { in: ['inA'] },
      b: { in: ['inA','inB'] },
      c: { in: ['inC'] },
      d: { in: ['inC','inD'] },
    })
  })
  it('skips toValidationSchema & appends isIn array of exisiting key', () => {
    addit[1].key = 'a'
    expect(services.appendToSchema(schema, addit)).toEqual({
      a: { in: ['inA','inC','inD'] },
      b: expect.anything(),
      c: expect.anything(),
    })
    expect(schemaSpy).toBeCalledTimes(1)
    expect(schemaSpy).toBeCalledWith('c',expect.anything(),expect.anything(),expect.anything())
  })
  it('accepts isIn as string (converts to single-member array)', () => {
    addit[0].isIn = 'inE'
    expect(services.appendToSchema(schema, addit)).toEqual({
      a: expect.anything(),
      b: expect.anything(),
      c: { in: ['inE'] },
      d: expect.anything(),
    })
    expect(schemaSpy).toBeCalledWith('c',expect.anything(),expect.anything(),['inE'])
  })
  it('isIn as string on matching key', () => {
    addit[1].key = 'b'
    addit[1].isIn = 'inE'
    expect(services.appendToSchema(schema, addit)).toEqual({
      a: expect.anything(),
      b: { in: ['inA','inB','inE'] },
      c: expect.anything(),
    })
  })
  it('skips toValidationSchema & warn on missing isIn option', () => {
    const warnSpy = jest.spyOn(require('../../libs/log'), 'warn').mockImplementationOnce(() => {})
    delete addit[0].isIn
    
    expect(services.appendToSchema(schema, addit)).toEqual({
      a: expect.anything(),
      b: expect.anything(),
      d: expect.anything(),
    })
    expect(schemaSpy).toBeCalledTimes(1)
    expect(schemaSpy).toBeCalledWith('d',expect.anything(),expect.anything(),expect.anything())
    expect(warnSpy).toBeCalledTimes(1)
    expect(warnSpy).toBeCalledWith('Missing "isIn" for key "c" from additional validator')
  })
})


describe('toValidationSchema', () => {

  describe('input vars', () => {
    it('key in return', () => {
      expect(services.toValidationSchema('test','any',null,['isIn'],false))
        .toHaveProperty('test', expect.any(Object))
    })
    it('isIn in return', () => {
      expect(services.toValidationSchema('test','any',null,['isIn'],false).test)
        .toHaveProperty('in', ['isIn'])
    })
    it('non-optional fields', () => {
      expect(services.toValidationSchema('test','any',null,['isIn'],false).test)
        .toHaveProperty('exists',{ errorMessage: expect.any(String) })
    })
    it('optional fields', () => {
      expect(services.toValidationSchema('test','any',null,['isIn'],true).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      parseTypeStr.mockReturnValueOnce({ type: 'any', string: 'any?', isOptional: true })
      expect(services.toValidationSchema('test','any?',null,['isIn'],true).test)
      .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      parseTypeStr.mockReturnValueOnce({ type: 'any', string: 'any?', isOptional: true })
      expect(services.toValidationSchema('test','any?',null,['isIn'],false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
    })
    it('string optionals', () => {
      expect(services.toValidationSchema('test','string',null,['isIn'],true).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      parseTypeStr.mockReturnValueOnce({ type: 'string', string: 'string?', isOptional: true })
      expect(services.toValidationSchema('test','string?',null,['isIn'],true).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      parseTypeStr.mockReturnValueOnce({ type: 'string', string: 'string?', isOptional: true })
      expect(services.toValidationSchema('test','string?',null,['isIn'],false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
    })
    it('limits for string/float/int', () => {
      expect(services.toValidationSchema('test','float','lims',['isIn'],false).test.isFloat)
        .toEqual({ options: 'lims', errorMessage: expect.any(String) })
      expect(services.toValidationSchema('test','int','lims',['isIn'],false).test.isInt)
        .toEqual({ options: 'lims', errorMessage: expect.any(String) })
      expect(services.toValidationSchema('test','string','lims',['isIn'],false).test.isString)
        .toEqual({ options: 'lims', errorMessage: expect.any(String) })
    })
    it('string w/ limit.min = 0', () => {
      expect(services.toValidationSchema('test','string',{min:  0},['isIn'],false).test)
        .toHaveProperty('optional', {options: {checkFalsy: true}})
      expect(services.toValidationSchema('test','string',{min: 10},['isIn'],false).test)
        .not.toHaveProperty('optional')
      expect(services.toValidationSchema('test','string',{elem:{min:  0}},['isIn'],false).test)
        .toHaveProperty('optional', {options: {checkFalsy: true}})
      expect(services.toValidationSchema('test','string',{elem:{min: 10}},['isIn'],false).test)
        .not.toHaveProperty('optional')
    })
    it('disableMin = true removes min from elem.limits', () => {
      const lims = { min: 12, test: 'lims' }
      expect(services.toValidationSchema('test','int',lims,['isIn'],false,true).test.isInt)
        .toHaveProperty('options',{ test: 'lims' })
      parseTypeStr.mockReturnValueOnce({ type: 'int', string: 'int[]', isArray: true })
      expect(services.toValidationSchema('test','int[]',{elem: lims},['isIn'],false,true)['test.*'].isInt)
        .toHaveProperty('options',{ test: 'lims' })
      parseTypeStr.mockReturnValueOnce({ type: 'int', string: 'int[]', isArray: true })
      expect(services.toValidationSchema('test','int[]',{array: lims},['isIn'],false,true).test.isArray)
        .toHaveProperty('options',{ min: 12, test: 'lims' })
    })
    it('disableMin does not disable min when type in ignoreDisableMin (float)', () => {
      const lims = { min: 12, test: 'lims' }
      expect(services.toValidationSchema('test','float',lims,['isIn'],false,true).test.isFloat)
        .toHaveProperty('options',{ min: 12, test: 'lims' })
      parseTypeStr.mockReturnValueOnce({ type: 'float', string: 'float[]', isArray: true })
      expect(services.toValidationSchema('test','float[]',{elem: lims},['isIn'],false,true)['test.*'].isFloat)
        .toHaveProperty('options',{ min: 12, test: 'lims' })
      parseTypeStr.mockReturnValueOnce({ type: 'float', string: 'float[]', isArray: true })
      expect(services.toValidationSchema('test','float[]',{array: lims},['isIn'],false,true).test.isArray)
        .toHaveProperty('options',{ min: 12, test: 'lims' })
    })
    it('just uses isType = { errorMsg } if missing limits', () => {
      expect(services.toValidationSchema('test','float',null,['isIn'],false).test.isFloat)
        .toEqual({ errorMessage: expect.any(String) })
      expect(services.toValidationSchema('test','int',null,['isIn'],false).test.isInt)
        .toEqual({ errorMessage: expect.any(String) })
    })
  })


  describe('types', () => {
    // Copy constants from validateServices
    const strictDates = true
    const dateOptions = { format: 'YYYY-MM-DD', strict: strictDates, delimiters: ['-'] }


    it('UUID', () => {
      const result = services.toValidationSchema('test','uuid',null,['isIn'],false)
      expect(result.test).toHaveProperty('isUUID', {options: 4, errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('b64', () => {
      const result = services.toValidationSchema('test','b64',null,['isIn'],false)
      expect(result.test).toHaveProperty('isBase64', {options: { urlSafe: false }, errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('b64url', () => {
      const result = services.toValidationSchema('test','b64url',null,['isIn'],false)
      expect(result.test).toHaveProperty('isBase64', {options: { urlSafe: true }, errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('hex', () => {
      const result = services.toValidationSchema('test','hex',null,['isIn'],false)
      expect(result.test).toHaveProperty('isHexadecimal', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('string', () => {
      const result = services.toValidationSchema('test','string',null,['isIn'],false)
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('string*', () => {
      parseTypeStr.mockReturnValueOnce({ type: 'string', string: 'string*', hasSpaces: true })
      const result = services.toValidationSchema('test','string*',null,['isIn'],false)
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).not.toHaveProperty('stripLow')
      expect(result.test).not.toHaveProperty('trim')
    })
    it('float', () => {
      const result = services.toValidationSchema('test','float',null,['isIn'],false)
      expect(result.test).toHaveProperty('isFloat', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('toFloat', true)
    })
    it('int', () => {
      const result = services.toValidationSchema('test','int',null,['isIn'],false)
      expect(result.test).toHaveProperty('isInt', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('toInt', true)
    })
    it('boolean', () => {
      const result = services.toValidationSchema('test','boolean',null,['isIn'],false)
      expect(result.test).toHaveProperty('custom', { options: 'isBooleanFunc', errorMessage: expect.any(String) })
      expect(result.test).toHaveProperty('customSanitizer', { options: 'parseBooleanFunc' })
    })
    it('datetime', () => {
      const result = services.toValidationSchema('test','datetime',null,['isIn'],false)
      expect(result.test).toHaveProperty('isISO8601', {
        options: 'TIME_OPTS',
        errorMessage: expect.any(String)
      })
      expect(result.test).toHaveProperty('toDate', true)
    })
    it('date', () => {
      const result = services.toValidationSchema('test','date',null,['isIn'],false)
      expect(result.test).toHaveProperty('isDate', {options: 'DATE_OPTS', errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('trim', true)
    })
    it('object', () => {
      const result = services.toValidationSchema('test','object',null,['isIn'],false)
      expect(result.test).toHaveProperty('isJSON', {
        options: expect.any(Object),
        errorMessage: expect.any(String),
      })
      expect(result.test.isJSON.options).toHaveProperty('allow_primitives',true)
    })
  })


  describe('array', () => {
    const getArrType = (string) => ({ string, isArray: true, type: string.replace('[]','') })
    beforeEach(() => { parseTypeStr.mockImplementationOnce(getArrType) })

    it('key & key.* in return', () => {
      const result = services.toValidationSchema('test','any[]',null,['isIn'],false)
      expect(result).toHaveProperty('test', expect.any(Object))
      expect(result["test.*"]).toEqual(expect.any(Object))
    })
    it('array has basic props', () => {
      const result = services.toValidationSchema('test','any[]',null,['isIn'],false)
      expect(result.test).toHaveProperty('isArray', {errorMessage: expect.any(String), options: null})
      expect(result.test).toHaveProperty('in', ['isIn'])
    })
    it('elements basic props', () => {
      const result = services.toValidationSchema('test','any[]',null,['isIn'],false)
      expect(result["test.*"]).not.toHaveProperty('isArray')
      expect(result["test.*"]).toHaveProperty('in', ['isIn'])
    })

    it('array has optional props', () => {
      let result = services.toValidationSchema('test','any[]',null,['isIn'],true)
      expect(result.test).toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      expect(result.test).not.toHaveProperty('exists')

      parseTypeStr.mockReturnValueOnce({ type: 'any', string: 'any[]?', isArray: true, isOptional: true })
      result = services.toValidationSchema('test','any[]?',null,['isIn'],false)
      expect(result.test).toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      expect(result.test).not.toHaveProperty('exists')
    })
    it('array has non-optional props', () => {
      const result = services.toValidationSchema('test','any[]',null,['isIn'],false)
      expect(result.test).toHaveProperty('exists', {errorMessage: expect.any(String)})
      expect(result.test).not.toHaveProperty('optional')
    })
    it('elements missing optional props', () => {
      let result = services.toValidationSchema('test','any[]',null,['isIn'],true)
      expect(result["test.*"]).not.toHaveProperty('optional')
      expect(result["test.*"]).not.toHaveProperty('exists')

      parseTypeStr.mockReturnValueOnce({ type: 'any', string: 'any[]?', isArray: true, isOptional: true })
      result = services.toValidationSchema('test','any[]?',null,['isIn'],false)
      expect(result["test.*"]).not.toHaveProperty('optional')
      expect(result["test.*"]).not.toHaveProperty('exists')

      parseTypeStr.mockImplementationOnce(getArrType)
      result = services.toValidationSchema('test','any[]',null,['isIn'],false)
      expect(result["test.*"]).not.toHaveProperty('optional')
      expect(result["test.*"]).not.toHaveProperty('exists')
    })
    
    it('type methods are under key.*', () => {
      const result = services.toValidationSchema('test','float[]',null,['isIn'],false)
      expect(result.test).not.toHaveProperty('isFloat')
      expect(result.test).not.toHaveProperty('toFloat')
      expect(result["test.*"]).toHaveProperty('isFloat', {errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('toFloat', true)
    })

    it('limits are key.arrayLimits', () => {
      const result = services.toValidationSchema('test','int[]','lims',['isIn'],false)
      expect(result.test).toHaveProperty('isArray', {options: 'lims', errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('isInt', {errorMessage: expect.any(String)})
    })
    it('limits.array for key & limits.elem for key.*', () => {
      const result = services.toValidationSchema('test','int[]',{array:'aLims',elem:'eLims'},['isIn'],false)
      expect(result.test).toHaveProperty('isArray', {options: 'aLims', errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('isInt', {options: 'eLims', errorMessage: expect.any(String)})
    })
    it('limits.array only', () => {
      const result = services.toValidationSchema('test','int[]',{array:'aLims'},['isIn'],false)
      expect(result.test).toHaveProperty('isArray', {options: 'aLims', errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('isInt', {errorMessage: expect.any(String)})
    })
    it('limits.elem only', () => {
      let result = services.toValidationSchema('test','int[]',{elem:'eLims'},['isIn'],false)
      expect(result.test).toHaveProperty('isArray', {errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('isInt', {options: 'eLims', errorMessage: expect.any(String)})
      result = services.toValidationSchema('test','int',{elem:'eLims'},['isIn'],false)
      expect(result.test).toHaveProperty('isInt', {options: 'eLims', errorMessage: expect.any(String)})
    })
  })

  describe('specifics', () => {
    it('boolean + optional', () => {
      expect(services.toValidationSchema('test','boolean',null,['isIn'],true).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: false}})
      parseTypeStr.mockReturnValueOnce({ type: 'boolean', string: 'boolean?', isOptional: true })
      expect(services.toValidationSchema('test','boolean?',null,['isIn'],true).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: false}})
      parseTypeStr.mockReturnValueOnce({ type: 'boolean', string: 'boolean?', isOptional: true })
      expect(services.toValidationSchema('test','boolean?',null,['isIn'],false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: false}})
    })
  })

  describe('errors', () => {
    it('errorMessage on key', () => {
      expect(services.toValidationSchema('test','any',null,['isIn'],false).test)
        .toHaveProperty('errorMessage', 'ErrMsg: type')
    })
    it('errorMessage on key.*', () => {
      parseTypeStr.mockReturnValueOnce({ type: 'any', string: 'any[]', isArray: true })
      expect(services.toValidationSchema('test','any[]',null,['isIn'],false)['test.*'])
        .toHaveProperty('errorMessage', 'ErrMsg: type')
    })
    it('throws on missing/invalid typeStr', () => {
      expect(() => services.toValidationSchema('test',undefined,null,['isIn'],false))
        .toThrowError('ErrMsg: missing')
      parseTypeStr.mockReturnValueOnce({})
      expect(() => services.toValidationSchema('test','?wrong',null,['isIn'],false))
        .toThrowError('ErrMsg: missing')
    })
    it('throws on missing/empty isIn', () => {
      expect(() => services.toValidationSchema('test','any',null,undefined,false))
        .toThrowError('ErrMsg: missingIn')
      expect(() => services.toValidationSchema('test','any',null,[],false))
        .toThrowError('ErrMsg: missingIn')
    })
    it('warns on using * w/o string', () => {
      const warnSpy = jest.spyOn(require('../../libs/log'), 'warn').mockImplementationOnce(() => {})
      parseTypeStr.mockReturnValueOnce({ type: 'any', string: 'any*', hasSpaces: true })
      
      services.toValidationSchema('test','any*',null,['isIn'],false)
      expect(warnSpy).toBeCalledTimes(1)
      expect(warnSpy).toBeCalledWith('* is ignored w/ non-string type: any*')
    })
  })
})


// MOCKS
jest.mock('../../config/validate.cfg', () => ({
  dateOptions: { time: 'TIME_OPTS', date: 'DATE_OPTS' },
  ignoreDisableMin: ['float'],
  errorMsgs: new Proxy({}, { get(_,key) { return () => 'ErrMsg: '+key } }),
}))
jest.mock('../../utils/validate.utils', () => ({
  parseTypeStr: jest.fn((type) => ({ type, string: type })),
  isBoolean: () => 'isBooleanFunc',
  parseBoolean: () => 'parseBooleanFunc',
}))