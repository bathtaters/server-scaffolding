// Spies & Imports
const checkValidation = require('../../middleware/validate.middleware')
const services = require('../../services/validate.services')
const schemaCfgSpy = jest.spyOn(services,   'getSchemaFromCfg')

const shared = require('../../validators/shared.validators')

// Mocks
jest.mock('express-validator', () => ({ checkSchema: jest.fn((r)=>[r]) }))
jest.mock('../../middleware/validate.middleware', () => 'checkValidation')
jest.mock('../constants/validation.cfg', () => ({
  types:  { routeA: { a: 'type1', b: 'type2' }, routeB: { c: 'type3', d: 'type4' }, },
  limits: { routeA: { a: 'lims1', b: 'lims2' }, routeB: { c: 'lims3' }, },
}))


// -- BY ROUTE tests -- //

describe('byRoute', () => {
  beforeAll(() => schemaCfgSpy.mockImplementation((_,key)=>({ [key]: true })))
  afterAll(() => schemaCfgSpy.mockRestore())

  it('calls getSchemaFromCfg forEach key', () => {
    shared.byRoute('routeA')(['a'],['a','b'],'opt')
    expect(schemaCfgSpy).toBeCalledTimes(2)
  })

  it('passes route to getSchemaFromCfg', () => {
    shared.byRoute('routeA')(['a'],['a','b'],'opt')
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(1, 
      'routeA',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(2, 
      'routeA',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })
  it('passes optionalBody to getSchemaFromCfg', () => {
    shared.byRoute('routeA')(['a'],['a','b'],'opt')
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'opt',
    )
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'opt',
    )
  })

  it('passes each key to getSchemaFromCfg', () => {
    shared.byRoute('routeA')(['a'],['a','b'],'opt',false)
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      'a',
      expect.anything(),
      expect.anything(),
    )
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      'b',
      expect.anything(),
      expect.anything(),
    )
  })
  it('builds isIn array for getSchemaFromCfg', () => {
    shared.byRoute('routeA')(['a'],['a','b'],'opt')
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.anything(),
      ['params','body'],
      expect.anything(),
    )
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.anything(),
      ['body'],
      expect.anything(),
    )
  })

  it('ignores falsy keys', () => {
    shared.byRoute('routeA')(['a'],0,'opt')
    expect(schemaCfgSpy).toBeCalledWith(
      expect.anything(),
      'a',
      ['params'],
      expect.anything(),
    )
    expect(schemaCfgSpy).toBeCalledTimes(1)
  })
  it('"all" as key list uses all keys under cfg.types', () => {
    shared.byRoute('routeB')('all',['d'],'opt')
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(1,
      expect.anything(),
      'c',
      ['params'],
      expect.anything(),
    )
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(2,
      expect.anything(),
      'd',
      ['params','body'],
      expect.anything(),
    )
    expect(schemaCfgSpy).toBeCalledTimes(2)
  })
  it('converts key string to array', () => {
    shared.byRoute('routeB')(['c'],'d','opt')
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(1,
      expect.anything(),
      'c',
      ['params'],
      expect.anything(),
    )
    expect(schemaCfgSpy).toHaveBeenNthCalledWith(2,
      expect.anything(),
      'd',
      ['body'],
      expect.anything(),
    )
    expect(schemaCfgSpy).toBeCalledTimes(2)
  })
  
  it('builds object of results', () => {
    expect(shared.byRoute('routeA')(['a'],['a','b'],'opt'))
      .toEqual([{ a: true, b: true }, checkValidation])
  })
})
