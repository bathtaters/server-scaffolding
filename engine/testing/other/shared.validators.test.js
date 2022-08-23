const shared = require('../../validators/shared.validators')
const { checkSchema } = require('express-validator')
const { filterDupes } = require('../../utils/common.utils')
const { generateSchema, appendToSchema } = require('../../services/validate.services')
const { deepCopy } = require('../test.utils')

const inputValues = [
  {
    schema: {
      a: { type: 'type1', limits: 'lims1' },
      b: { type: 'type2', limits: 'lims2' },
    },
  },{
    schema: {
      c: { type: 'type3', limits: 'lims3' },
      d: { type: 'type4'},
    },
  },{
    primaryId: 'g',
    schema: {
      e: { type: 'type5', html: 'html5' },
      f: { type: 'type6', default: 'default6' },
      g: { type: 'type7' },
    },
  }
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
    expect(checkSchema).toBeCalledWith('RESULT')
  })
  it('includes checkValidation & arraySchema', () => {
    expect(shared.byObject('TEST'))
      .toEqual(expect.arrayContaining(['checkValidation']))
    expect(shared.byObject('TEST'))
      .toEqual(expect.arrayContaining(['arraySchema']))
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
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      'b',
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
      expect.objectContaining({ type: 'type1' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.objectContaining({ type: 'type2' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })
  it('passes limits to generateSchema', () => {
    shared.byModel(testModel[0],['a','b'])
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.objectContaining({ limits: 'lims1' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.objectContaining({ limits: 'lims2' }),
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
      'opt',
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
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
      'part',
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
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
      ['params','body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.anything(),
      ['body'],
      expect.anything(),
      expect.anything(),
    )
  })

  it('force optional for primaryId or keys w/ defaults', () => {
    shared.byModel(testModel[2],['e','f','g'],{ optionalBody: false })
    expect(generateSchema).toBeCalledWith(
      'e',
      expect.anything(),
      expect.anything(),
      false,
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'f',
      expect.anything(),
      expect.anything(),
      true,
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'g',
      expect.anything(),
      expect.anything(),
      true,
      expect.anything(),
    )
    expect(generateSchema).toBeCalledTimes(3)
  })

  it('ignores falsy keys', () => {
    shared.byModel(testModel[0],0,{ params: ['a'] })
    expect(generateSchema).toBeCalledWith(
      'a',
      expect.anything(),
      ['params'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledTimes(1)
  })
  it('"all" as key uses all keys w/ html value + primaryKey', () => {
    shared.byModel(testModel[2],'all',{ params: ['g'] })
    expect(generateSchema).toBeCalledWith(
      'e',
      expect.anything(),
      ['body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'g',
      expect.anything(),
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
      ['params'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'd',
      expect.anything(),
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
      ['params', 'params', 'body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'd',
      expect.anything(),
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
      ['params', 'body'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'd',
      expect.anything(),
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
  it('includes checkValidation & arraySchema in result', () => {
    expect(shared.byModel(testModel[0],['a','b'],{ params: ['a'] }))
      .toEqual(expect.arrayContaining(['checkValidation']))
    expect(shared.byModel(testModel[0],['a','b'],{ params: ['a'] }))
      .toEqual(expect.arrayContaining(['arraySchema']))
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
      ['query'],
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toBeCalledWith(
      'b',
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
jest.mock('../../utils/validate.utils', () => ({ toArraySchema: () => 'arraySchema' }))
jest.mock('../../services/validate.services', () => ({
  generateSchema: jest.fn((key)=>({ [key]: true })),
  appendToSchema: jest.fn((obj) => obj),
}))