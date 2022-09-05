const { defaultLimits } = require('../../config/validate.cfg')
const services = require('../../services/validate.services')
const { parseTypeStr } = require('../../utils/model.utils')


describe('generateSchema', () => {
  const schemaSpy = jest.spyOn(services, 'toValidationSchema')

  beforeAll(() => { schemaSpy.mockImplementation(()=>{}) })
  // afterAll(() => { schemaSpy.mockRestore() })
  
  describe('input vars', () => {
    it('calls toValidationSchema', () => {
      services.generateSchema('NAME', 'DATA', ['isIn'], false, false)
      expect(schemaSpy).toBeCalledTimes(1)
    })
    it('passes key', () => {
      services.generateSchema('NAME', 'DATA', ['isIn'], false, false)
      expect(schemaSpy).toBeCalledWith(
        'NAME',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      )
    })
    it('passes typeStr', () => {
      services.generateSchema('NAME', 'DATA', ['isIn'], false, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        'DATA',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      )
    })
    it('passes isIn', () => {
      services.generateSchema('NAME', 'DATA', ['isIn'], false, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        ['isIn'],
        expect.anything(),
        expect.anything(),
      )
    })
    it('passes falsy optional', () => {
      services.generateSchema('NAME', 'DATA', ['isIn'], 0, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        0,
        expect.anything(),
      )
    })
    it('passes disableMin', () => {
      services.generateSchema('NAME', 'DATA', ['isIn'], false, 'noMin')
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'noMin',
      )
    })
  })

  describe('optional = true', () => {
    it('isIn is not "body"', () => {
      services.generateSchema('NAME', 'DATA', ['body'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true,
        expect.anything(),
      )
    })
    it('isIn is "query"', () => {
      services.generateSchema('NAME', 'DATA', ['query'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true,
        expect.anything(),
      )
    })
    it('isIn is "body" + "query"', () => {
      services.generateSchema('NAME', 'DATA', ['body','query'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true,
        expect.anything(),
      )
    })
    it('isIn is "params"', () => {
      services.generateSchema('NAME', 'DATA', ['params'], true, false)
      expect(schemaSpy).toBeCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        false,
        expect.anything(),
      )
    })
  })
})


describe('appendToSchema', () => {
  const schemaSpy = jest.spyOn(services, 'toValidationSchema')
  beforeAll(() => { schemaSpy.mockImplementation((key,d,isIn) => ({ [key]: { in: isIn } })) })
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
    expect(schemaSpy).toBeCalledWith('c',expect.anything(),expect.anything())
    expect(schemaSpy).toBeCalledWith('d',expect.anything(),expect.anything())
  })
  it('runs each entry through parseTypeStr', () => {
    services.appendToSchema(schema, addit)
    expect(parseTypeStr).toBeCalledTimes(2)
    expect(parseTypeStr).toBeCalledWith(addit[0])
    expect(parseTypeStr).toBeCalledWith(addit[1])
  })
  it('passes entry options to toValidationSchema', () => {
    services.appendToSchema(schema, addit)
    expect(schemaSpy).toBeCalledWith('c', addit[0], ['inC'])
    expect(schemaSpy).toBeCalledWith('d', addit[1], ['inC','inD'])
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
    expect(schemaSpy).toBeCalledWith('c',expect.anything(),expect.anything())
  })
  it('accepts isIn as string (converts to single-member array)', () => {
    addit[0].isIn = 'inE'
    expect(services.appendToSchema(schema, addit)).toEqual({
      a: expect.anything(),
      b: expect.anything(),
      c: { in: ['inE'] },
      d: expect.anything(),
    })
    expect(schemaSpy).toBeCalledWith('c',expect.anything(),['inE'])
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
    expect(schemaSpy).toBeCalledWith('d',expect.anything(),expect.anything())
    expect(warnSpy).toBeCalledTimes(1)
    expect(warnSpy).toBeCalledWith('Missing "isIn" for key "c" from additional validator')
  })
})


describe('toValidationSchema', () => {

  describe('input vars', () => {
    it('key in return', () => {
      expect(services.toValidationSchema('test',{type: 'any'},['isIn'],false,false))
        .toHaveProperty('test', expect.any(Object))
    })
    it('isIn in return', () => {
      expect(services.toValidationSchema('test',{type: 'any'},['isIn'],false,false).test)
        .toHaveProperty('in', ['isIn'])
    })
    it('non-optional fields', () => {
      expect(services.toValidationSchema('test',{type: 'any'},['isIn'],false,false).test)
        .toHaveProperty('exists',{ errorMessage: expect.any(String) })
    })
    it('optional fields', () => {
      expect(services.toValidationSchema('test',{type: 'any'},['isIn'],true,false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      expect(services.toValidationSchema('test',{type: 'any', isOptional: true},['isIn'],true,false).test)
      .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      expect(services.toValidationSchema('test',{type: 'any', isOptional: true},['isIn'],false,false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
    })
    it('string optionals', () => {
      expect(services.toValidationSchema('test',{type: 'string'},['isIn'],true,false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      expect(services.toValidationSchema('test',{type: 'string', isOptional: true},['isIn'],true,false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      expect(services.toValidationSchema('test',{type: 'string', isOptional: true},['isIn'],false,false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
    })
    it('limits for string/float/int', () => {
      expect(services.toValidationSchema('test',{type: 'float', limits: 'lims'},['isIn'],false,false).test.isFloat)
        .toEqual({ options: 'lims', errorMessage: expect.any(String) })
      expect(services.toValidationSchema('test',{type: 'int', limits: 'lims'},['isIn'],false,false).test.isInt)
        .toEqual({ options: 'lims', errorMessage: expect.any(String) })
      expect(services.toValidationSchema('test',{type: 'string', limits: 'lims'},['isIn'],false,false).test.isLength)
        .toEqual({ options: 'lims', errorMessage: expect.any(String) })
    })
    it('string w/ limit.min = 0', () => {
      expect(services.toValidationSchema('test',{type: 'string', limits: {min: 0}},['isIn'],false,false).test)
        .toHaveProperty('optional', {options: {checkFalsy: true}})
      expect(services.toValidationSchema('test',{type: 'string', limits: {min:10}},['isIn'],false,false).test)
        .not.toHaveProperty('optional')
      expect(services.toValidationSchema('test',{type: 'string', limits: {elem:{min: 0}}},['isIn'],false,false).test)
        .toHaveProperty('optional', {options: {checkFalsy: true}})
      expect(services.toValidationSchema('test',{type: 'string', limits: {elem:{min:10}}},['isIn'],false,false).test)
        .not.toHaveProperty('optional')
    })
    it('disableMin = true removes min from elem.limits', () => {
      const limits = { min: 12, test: 'lims' }
      expect(services.toValidationSchema('test',{type: 'int', limits},['isIn'],false,true).test.isInt)
        .toHaveProperty('options',{ test: 'lims' })
      expect(services.toValidationSchema('test',{type: 'int', isArray: true, limits: {elem: limits}},['isIn'],false,true)['test.*'].isInt)
        .toHaveProperty('options',{ test: 'lims' })
      expect(services.toValidationSchema('test',{type: 'int', isArray: true, limits: {array: limits}},['isIn'],false,true).test.isArray)
        .toHaveProperty('options',{ min: 12, test: 'lims' })
    })
    it('disableMin does not disable min when type in ignoreDisableMin (float)', () => {
      const limits = { min: 12, test: 'lims' }
      expect(services.toValidationSchema('test',{type: 'float', limits},['isIn'],false,true).test.isFloat)
        .toHaveProperty('options',{ min: 12, test: 'lims' })
      expect(services.toValidationSchema('test',{type: 'float', isArray: true, limits: {elem:  limits}},['isIn'],false,true)['test.*'].isFloat)
        .toHaveProperty('options',{ min: 12, test: 'lims' })
      expect(services.toValidationSchema('test',{type: 'float', isArray: true, limits: {array: limits}},['isIn'],false,true).test.isArray)
        .toHaveProperty('options',{ min: 12, test: 'lims' })
    })
    it('assigns default limits if missing limits', () => {
      defaultLimits.string = { min: 'def', max: 34 }
      expect(services.toValidationSchema('test',{type: 'string'},['isIn'],false,false).test.isLength)
        .toHaveProperty('options', { min: 'def', max: 34 })
      delete defaultLimits.string
    })
    it('just uses isType = { errorMsg } if missing limits', () => {
      expect(services.toValidationSchema('test',{type: 'float'},['isIn'],false,false).test.isFloat)
        .toEqual({ errorMessage: expect.any(String) })
      expect(services.toValidationSchema('test',{type:   'int'},['isIn'],false,false).test.isInt)
        .toEqual({ errorMessage: expect.any(String) })
    })
  })


  describe('types', () => {
    it('UUID', () => {
      const result = services.toValidationSchema('test',{type:'uuid'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isUUID', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('b64', () => {
      const result = services.toValidationSchema('test',{type:'b64'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isBase64', {options: { urlSafe: false }, errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('b64url', () => {
      const result = services.toValidationSchema('test',{type:'b64url'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isBase64', {options: { urlSafe: true }, errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('hex', () => {
      const result = services.toValidationSchema('test',{type:'hex'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isHexadecimal', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('string', () => {
      const result = services.toValidationSchema('test',{type:'string'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('stripLow', true)
      expect(result.test).toHaveProperty('trim', true)
    })
    it('string*', () => {
      const result = services.toValidationSchema('test',{type: 'string', hasSpaces: true},['isIn'],false,false)
      expect(result.test).toHaveProperty('isString', {errorMessage: expect.any(String)})
      expect(result.test).not.toHaveProperty('stripLow')
      expect(result.test).not.toHaveProperty('trim')
    })
    it('float', () => {
      const result = services.toValidationSchema('test',{type:'float'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isFloat', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('toFloat', true)
    })
    it('int', () => {
      const result = services.toValidationSchema('test',{type:'int'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isInt', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('toInt', true)
    })
    it('boolean', () => {
      const result = services.toValidationSchema('test',{type:'boolean'},['isIn'],false,false)
      expect(result.test).toHaveProperty('custom', { options: 'isBooleanFunc', errorMessage: expect.any(String) })
      expect(result.test).toHaveProperty('customSanitizer', { options: 'parseBooleanFunc' })
    })
    it('datetime', () => {
      const result = services.toValidationSchema('test',{type:'datetime'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isISO8601', {
        options: 'TIME_OPTS',
        errorMessage: expect.any(String)
      })
      expect(result.test).toHaveProperty('toDate', true)
    })
    it('date', () => {
      const result = services.toValidationSchema('test',{type:'date'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isDate', {options: 'DATE_OPTS', errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('trim', true)
    })
    it('object', () => {
      const result = services.toValidationSchema('test',{type:'object'},['isIn'],false,false)
      expect(result.test).toHaveProperty('isJSON', {
        options: expect.any(Object),
        errorMessage: expect.any(String),
      })
      expect(result.test.isJSON.options).toHaveProperty('allow_primitives',false)
    })
  })

  const arrType = (string, isOptional, limits) => ({ string, isArray: true, isOptional, limits, type: string.replace('[]','') })
  
  describe('array', () => {
    it('key & key.* in return', () => {
      const result = services.toValidationSchema('test',arrType('any[]'),['isIn'],false,false)
      expect(result).toHaveProperty('test', expect.any(Object))
      expect(result["test.*"]).toEqual(expect.any(Object))
    })
    it('array has basic props', () => {
      const result = services.toValidationSchema('test',arrType('any[]'),['isIn'],false,false)
      expect(result.test).toHaveProperty('toArray')
      expect(result.test).toHaveProperty('isArray', {errorMessage: expect.any(String)})
      expect(result.test).toHaveProperty('in', ['isIn'])
    })
    it('elements basic props', () => {
      const result = services.toValidationSchema('test',arrType('any[]'),['isIn'],false,false)
      expect(result["test.*"]).not.toHaveProperty('isArray')
      expect(result["test.*"]).toHaveProperty('in', ['isIn'])
    })

    it('array has optional props', () => {
      let result = services.toValidationSchema('test',arrType('any[]'),['isIn'],true,false)
      expect(result.test).toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      expect(result.test).not.toHaveProperty('exists')

      result = services.toValidationSchema('test',arrType('any[]',true),['isIn'],false,false)
      expect(result.test).toHaveProperty('optional', {options: {nullable: true, checkFalsy: true}})
      expect(result.test).not.toHaveProperty('exists')
    })
    it('array has non-optional props', () => {
      const result = services.toValidationSchema('test',arrType('any[]'),['isIn'],false,false)
      expect(result.test).toHaveProperty('exists', {errorMessage: expect.any(String)})
      expect(result.test).not.toHaveProperty('optional')
    })
    it('array passes isOptional to toArray', () => {
      const result = services.toValidationSchema('test',{type: 'any', isArray: true, isOptional: 'isOpt'},['isIn'],false,false)
      expect(result.test).toHaveProperty('toArray', 'isOpt')
    })
    it('elements missing optional props', () => {
      let result = services.toValidationSchema('test',arrType('any[]'),['isIn'],true,false)
      expect(result["test.*"]).not.toHaveProperty('optional')
      expect(result["test.*"]).not.toHaveProperty('exists')

      result = services.toValidationSchema('test',arrType('any[]',true),['isIn'],false,false)
      expect(result["test.*"]).not.toHaveProperty('optional')
      expect(result["test.*"]).not.toHaveProperty('exists')

      result = services.toValidationSchema('test',arrType('any[]'),['isIn'],false,false)
      expect(result["test.*"]).not.toHaveProperty('optional')
      expect(result["test.*"]).not.toHaveProperty('exists')
    })
    
    it('type methods are under key.*', () => {
      const result = services.toValidationSchema('test',arrType('float[]'),['isIn'],false,false)
      expect(result.test).not.toHaveProperty('isFloat')
      expect(result.test).not.toHaveProperty('toFloat')
      expect(result["test.*"]).toHaveProperty('isFloat', {errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('toFloat', true)
    })

    it('limits are key.arrayLimits', () => {
      const result = services.toValidationSchema('test',arrType('int[]',0,'lims'),['isIn'],false,false)
      expect(result.test).toHaveProperty('isArray', {options: 'lims', errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('isInt', {errorMessage: expect.any(String)})
    })
    it('limits.array for key & limits.elem for key.*', () => {
      const result = services.toValidationSchema('test',arrType('int[]',0,{array:'aLims',elem:'eLims'}),['isIn'],false,false)
      expect(result.test).toHaveProperty('isArray', {options: 'aLims', errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('isInt', {options: 'eLims', errorMessage: expect.any(String)})
    })
    it('limits.array only', () => {
      const result = services.toValidationSchema('test',arrType('int[]',0,{array:'aLims'}),['isIn'],false,false)
      expect(result.test).toHaveProperty('isArray', {options: 'aLims', errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('isInt', {errorMessage: expect.any(String)})
    })
    it('limits.elem only', () => {
      let result = services.toValidationSchema('test',arrType('int[]',0,{elem:'eLims'}),['isIn'],false,false)
      expect(result.test).toHaveProperty('isArray', {errorMessage: expect.any(String)})
      expect(result["test.*"]).toHaveProperty('isInt', {options: 'eLims', errorMessage: expect.any(String)})
      result = services.toValidationSchema('test',{type: 'int', limits: {elem:'eLims'}},['isIn'],false,false)
      expect(result.test).toHaveProperty('isInt', {options: 'eLims', errorMessage: expect.any(String)})
    })
    it('assigns default array limits if missing', () => {
      defaultLimits.array = { min: 'defArr', max: 56 }
      expect(services.toValidationSchema('test',arrType('int[]'),['isIn'],false,false).test.isArray)
        .toHaveProperty('options', { min: 'defArr', max: 56 })
      expect(services.toValidationSchema('test',arrType('int[]',0,{elem:'eLims'}),['isIn'],false,false).test.isArray)
        .toHaveProperty('options', { min: 'defArr', max: 56 })
      delete defaultLimits.array
    })
  })

  describe('specifics', () => {
    it('boolean + optional', () => {
      expect(services.toValidationSchema('test',{type:'boolean'},['isIn'],true,false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: false}})
      expect(services.toValidationSchema('test',{type: 'boolean', isOptional: true},['isIn'],true,false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: false}})
      expect(services.toValidationSchema('test',{type: 'boolean', isOptional: true},['isIn'],false,false).test)
        .toHaveProperty('optional', {options: {nullable: true, checkFalsy: false}})
    })
  })

  describe('errors', () => {
    it('errorMessage on key', () => {
      expect(services.toValidationSchema('test',{type: 'any'},['isIn'],false,false).test)
        .toHaveProperty('errorMessage', 'ErrMsg: type')
    })
    it('errorMessage on key.*', () => {
      expect(services.toValidationSchema('test',arrType('any[]'),['isIn'],false,false)['test.*'])
        .toHaveProperty('errorMessage', 'ErrMsg: type')
    })
    it('throws on missing/invalid type', () => {
      expect(() => services.toValidationSchema('test',{},['isIn'],false,false))
        .toThrowError('ErrMsg: missing')
    })
    it('throws on missing/empty isIn', () => {
      expect(() => services.toValidationSchema('test',{type: 'any'},undefined,false))
        .toThrowError('ErrMsg: missingIn')
      expect(() => services.toValidationSchema('test',{type: 'any'},[],false,false))
        .toThrowError('ErrMsg: missingIn')
    })
    it('warns on using * w/o string', () => {
      const warnSpy = jest.spyOn(require('../../libs/log'), 'warn').mockImplementationOnce(() => {})
      
      services.toValidationSchema('test',{type: 'any', hasSpaces: true, typeStr: 'any*'},['isIn'],false,false)
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
  defaultLimits: {},
}))
jest.mock('../../utils/model.utils', () => ({
  parseTypeStr: jest.fn((data) => data),
}))
jest.mock('../../utils/validate.utils', () => ({
  isBoolean: () => 'isBooleanFunc',
  parseBoolean: () => 'parseBooleanFunc',
}))