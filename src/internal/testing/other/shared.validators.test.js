const shared = require('../../validators/shared.validators')
const { checkSchema } = require('express-validator')
const { filterDupes } = require('../../utils/common.utils')
const { generateSchema, appendToSchema } = require('../../services/validate.services')
const { deepCopy } = require('../test.utils')

const inputValues = [
  {
    types:  { a: 'type1', b: 'type2' },
    limits: { a: 'lims1', b: 'lims2' },
  },{
    types:  { c: 'type3', d: 'type4' },
    limits: { c: 'lims3' },
  },
]


// -- BY OBJECT tests -- //

describe('byObject', () => {
  it('uses appendToSchema', () => {
    shared.byObject('TEST')
    expect(appendToSchema).toBeCalledTimes(1)
    expect(appendToSchema).toBeCalledWith(expect.anything(), 'TEST')
  })
  it('passes result to checkSchema', () => {
    appendToSchema.mockReturnValueOnce('RESULT')
    shared.byObject('TEST')
    expect(checkSchema).toBeCalledTimes(1)
    expect(checkSchema).toBeCalledWith('RESULT')
  })
  it('includes checkValidation', () => {
    expect(shared.byObject('TEST'))
      .toEqual(expect.arrayContaining(['checkValidation']))
  })
})


// -- BY MODEL tests -- //

describe('byModel', () => {
  let testModel
  beforeEach(() => { testModel = deepCopy(inputValues) })

  it('calls generateSchema forEach key', () => {
    shared.byModel(testModel[0],['a','b'])
    expect(generateSchema).toBeCalledTimes(2)
  })

  it('passes keys to generateSchema', () => {
    shared.byModel(testModel[0],['a','b'])
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      'a',
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      'b',
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })
  it('passes types to generateSchema', () => {
    shared.byModel(testModel[0],['a','b'])
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      'type1',
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      'type2',
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })
  it('passes limits to generateSchema', () => {
    shared.byModel(testModel[0],['a','b'])
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.anything(),
      'lims1',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.anything(),
      'lims2',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })

  it('passes optionalBody to generateSchema', () => {
    shared.byModel(testModel[0],['a','b'],{ optionalBody: 'opt' })
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'opt',
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'opt',
      expect.anything(),
    )
  })
  it('passes partialMatch to generateSchema', () => {
    shared.byModel(testModel[0],['a','b'],{ allowPartials: 'part' })
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'part',
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'part',
    )
  })

  it('builds isIn array for generateSchema', () => {
    shared.byModel(testModel[0],['a','b'],{ params: ['a'] })
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      ['params','body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      ['body'],
      expect.anything(),
      expect.anything(),
    )
  })

  it('ignores falsy keys', () => {
    shared.byModel(testModel[0],0,{ params: ['a'] })
    expect(generateSchema).toBeCalledWith(
      'a',
      expect.anything(),
      expect.anything(),
      ['params'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledTimes(1)
  })
  it('"all" as key list uses all keys under cfg.types', () => {
    shared.byModel(testModel[1],'all',{ params: ['d'] })
    expect(generateSchema).toBeCalledWith(
      'c',
      expect.anything(),
      expect.anything(),
      ['body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'd',
      expect.anything(),
      undefined, // No limits
      ['params','body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledTimes(2)
  })
  it('converts key string to single-member array', () => {
    shared.byModel(testModel[1],'d',{ params: 'c' })
    expect(generateSchema).toBeCalledWith(
      'c',
      expect.anything(),
      expect.anything(),
      ['params'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'd',
      expect.anything(),
      undefined, // No limits
      ['body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledTimes(2)
  })
  it('normalizes input objects to value arrays', () => {
    shared.byModel(testModel[1],{ c3: 'c', d: 'd' },{ params: { c1: 'c', c2: 'c' }})
    expect(generateSchema).toBeCalledWith(
      'c',
      expect.anything(),
      expect.anything(),
      ['params', 'params', 'body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'd',
      expect.anything(),
      undefined, // No limits
      ['body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledTimes(2)
  })
  it('removes dupes from input object values', () => {
    shared.byModel(testModel[1],{ c3: 'c', d: 'd' },{ params: { c1: 'c', c2: 'c' }})
    expect(filterDupes).toBeCalledTimes(2)
    expect(filterDupes).toBeCalledWith(['c','d'])
    expect(filterDupes).toBeCalledWith(['c','c'])
  })
  it('mixing input object with array', () => {
    filterDupes.mockReturnValueOnce(['c'])
    shared.byModel(testModel[1],['c','d'],{ params: { c1: 'c', c2: 'c' }})
    expect(generateSchema).toBeCalledWith(
      'c',
      expect.anything(),
      expect.anything(),
      ['params', 'body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'd',
      expect.anything(),
      undefined, // No limits
      ['body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledTimes(2)
  })
  
  it('builds object of results', () => {
    expect(shared.byModel(testModel[0],['a','b'],{ params: ['a'] }))
      .toEqual(expect.arrayContaining([{ a: true, b: true }]))
  })
  it('includes checkValidation in result', () => {
    expect(shared.byModel(testModel[0],['a','b'],{ params: ['a'] }))
      .toEqual(expect.arrayContaining(['checkValidation']))
  })
  it('results are renamed using input object keys', () => {
    expect(shared.byModel(testModel[1],{ c3: 'c', d: 'd' },{ params: { c1: 'c', c2: 'c' }}))
      .toEqual(expect.arrayContaining([{ c1: true, c2: true, c3: true, d: true }]))
  })

  it('gets additional validation', () => {
    appendToSchema.mockReturnValueOnce('RESULT')
    expect(shared.byModel(testModel[0],['a'],{ additional: 'TEST' }))
      .toEqual(expect.arrayContaining(['RESULT']))
    expect(appendToSchema).toBeCalledTimes(1)
    expect(appendToSchema).toBeCalledWith({ a: true },'TEST')
  })

  it('asQueryStr makes isIn = query', () => {
    shared.byModel(testModel[0],['a','b'],{ asQueryStr: true, params: ['b'] })
    expect(generateSchema).toBeCalledWith(
      'a',
      expect.anything(),
      expect.anything(),
      ['query'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'b',
      expect.anything(),
      expect.anything(),
      ['params','query'],
      expect.anything(),
      expect.anything(),
    )
  })
})


// MOCKS

jest.mock('express-validator', () => ({ checkSchema: jest.fn((r)=>[r]) }))
jest.mock('../../middleware/validate.middleware', () => 'checkValidation')
jest.mock('../../utils/common.utils', () => ({ filterDupes: jest.fn((o)=>o) }))
jest.mock('../../services/validate.services', () => ({
  generateSchema: jest.fn((key)=>({ [key]: true })),
  appendToSchema: jest.fn((obj) => obj),
}))