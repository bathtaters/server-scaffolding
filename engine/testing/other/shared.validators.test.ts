import type { ValidationOptions } from '../../types/validate.d'
import { checkSchema } from 'express-validator'
import { byObject, byModel, type ModelValBase } from '../../validators/shared.validators'
import { generateSchema, appendToSchema } from '../../services/validate.services'
import { filterDupes } from '../../utils/common.utils'
import { deepCopy } from '../test.utils'


/** Example Model Schemas */
const inputValues: ModelValBase[] = [
  {
    primaryId: 'a',
    schema: {
      a: {
        typeBase: 'int',
        limits: { min: 1 },
        html: 'number',
        db: 'INTEGER PRIMARY KEY',
      },
      b: {
        typeBase: 'string',
        isOptional: true,
        limits: { max: 2 },
        html: 'text',
        db: 'TEXT NOT NULL',
      },
    },
  },{
    primaryId: 'd',
    schema: {
      c: {
        typeBase: 'float',
        isArray: true,
        limits: { max: 3 },
        html: 'text',
        db: false,
      },
      d: {
        typeBase: 'object',
        html: 'hidden',
        db: 'TEXT PRIMARY KEY',
      },
    },
  },{
    primaryId: 'g',
    schema: {
      e: {
        typeBase: 'html',
        isOptional: true,
        html: false,
        db: 'BLOB NOT NULL',
      },
      f: {
        typeBase: 'date',
        default: new Date(2001, 9, 10),
        html: 'date',
        db: 'INTEGER NOT NULL',
      },
      g: {
        typeBase: 'float',
        limits: { min: -6, max: 7 },
        html: false,
        db: 'REAL PRIMARY KEY',
      },
    },
  }
]

/** Example Validation Options */
const validOptions: ValidationOptions[] = [
  { key: 'additC', type: 'float', isIn: ['query'] },
  { key: 'additD', type: 'html?', isIn: ['cookies'] },
]


// -- BY OBJECT tests -- //

describe('byObject', () => {
  it('uses appendToSchema', () => {
    byObject({ a: { type: 'b64?' }, b: { type: 'boolean[]' }})
    expect(appendToSchema).toBeCalledTimes(1)
    expect(appendToSchema).toBeCalledWith(undefined, [
      expect.objectContaining({ key: 'a' }),
      expect.objectContaining({ key: 'b' }),
    ])
  })
  it('uses isIn for each entry', () => {
    byObject({ a: { type: 'b64?' }, b: { type: 'boolean[]' }}, ['cookies'])
    expect(appendToSchema).toBeCalledWith(undefined, [
      expect.objectContaining({ isIn: ['cookies'] }),
      expect.objectContaining({ isIn: ['cookies'] }),
    ])
  })
  it('forces optional', () => {
    byObject({ a: { type: 'b64' }, b: { type: 'boolean[]' }}, ['cookies'], { forceOptional: true })
    expect(appendToSchema).toBeCalledWith(undefined, [
      expect.objectContaining({ type: expect.stringMatching(/\?$/) }),
      expect.objectContaining({ type: expect.stringMatching(/\?$/) }),
    ])
  })
  it('concats additional', () => {
    const additional = deepCopy(validOptions)

    byObject(
      { a: { type: 'b64?' }, b: { type: 'boolean[]' }},
      ['cookies'],
      { additional }
    )
    expect(appendToSchema).toBeCalledWith(undefined, [
      expect.any(Object),
      expect.any(Object),
      additional[0],
      additional[1],
    ])
  })
  it('passes appendToSchema result to checkSchema', () => {
    (appendToSchema as jest.Mock).mockReturnValueOnce('RESULT')
    byObject({ a: { type: 'b64?' }, b: { type: 'boolean[]' }})
    expect(checkSchema).toBeCalledWith('RESULT')
  })
  it('includes checkValidation & arraySchema', () => {
    const ret = byObject({ a: { type: 'b64?' }, b: { type: 'boolean[]' }})
    expect(ret).toEqual(expect.arrayContaining(['checkValidation']))
    expect(ret).toEqual(expect.arrayContaining(['arraySchema']))
  })
})


// -- BY MODEL tests -- //

describe('byModel', () => {
  let testModel: ModelValBase[]
  beforeEach(() => { testModel = deepCopy(inputValues) })

  it('calls generateSchema forEach key', () => {
    byModel(testModel[0],['a','b'])
    expect(generateSchema).toBeCalledTimes(2)
  })

  it('passes keys to generateSchema', () => {
    byModel(testModel[0],['a','b'])
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
    byModel(testModel[0],['a','b'])
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.objectContaining({ typeBase: 'int' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.objectContaining({ typeBase: 'string' }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })
  it('passes limits to generateSchema', () => {
    byModel(testModel[0],['a','b'])
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.objectContaining({ limits: { min: 1 } }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.objectContaining({ limits: { max: 2 } }),
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })

  it('passes optionalBody to generateSchema', () => {
    byModel(testModel[0],['a','b'],{ optionalBody: true })
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      expect.anything(),
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      true,
      expect.anything(),
    )
  })
  it('passes partialMatch to generateSchema', () => {
    byModel(testModel[0],['a','b'],{ allowPartials: false })
    expect(generateSchema).toHaveBeenNthCalledWith(1, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      false,
    )
    expect(generateSchema).toHaveBeenNthCalledWith(2, 
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      false,
    )
  })

  it('builds isIn array for generateSchema', () => {
    byModel(testModel[0],['a','b'],{ params: ['a'] })
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
    byModel(testModel[2],['e','f','g'],{ optionalBody: false })
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
    byModel(testModel[0],undefined,{ params: ['a'] })
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
    byModel(testModel[2],'all',{ params: ['g'] })
    expect(generateSchema).toBeCalledWith(
      'f',
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
  it('normalizes input objects to value arrays', () => {
    byModel(testModel[1],{ c3: 'c', d: 'd' },{ params: { c1: 'c', c2: 'c' }})
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
    byModel(testModel[1],{ c3: 'c', d: 'd' },{ params: { c1: 'c', c2: 'c' }})
    expect(filterDupes).toBeCalledTimes(2)
    expect(filterDupes).toBeCalledWith(['c','d'])
    expect(filterDupes).toBeCalledWith(['c','c'])
  })
  it('mixing input object with array', () => {
    (filterDupes as jest.Mock).mockReturnValueOnce(['c'])
    byModel(testModel[1],['c','d'],{ params: { c1: 'c', c2: 'c' }})
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
    expect(byModel(testModel[0],['a','b'],{ params: ['a'] }))
      .toEqual(expect.arrayContaining([{ a: true, b: true }]))
  })
  it('includes checkValidation & arraySchema in result', () => {
    expect(byModel(testModel[0],['a','b'],{ params: ['a'] }))
      .toEqual(expect.arrayContaining(['checkValidation']))
    expect(byModel(testModel[0],['a','b'],{ params: ['a'] }))
      .toEqual(expect.arrayContaining(['arraySchema']))
  })
  it('results are renamed using input object keys', () => {
    expect(byModel(testModel[1],{ c3: 'c', d: 'd' },{ params: { c1: 'c', c2: 'c' }}))
      .toEqual(expect.arrayContaining([{ c1: true, c2: true, c3: true, d: true }]))
  })

  it('gets additional validation', () => {
    (appendToSchema as jest.Mock).mockReturnValueOnce('RESULT')
    const additional = deepCopy(validOptions)

    expect(byModel(testModel[0],['a'],{ additional }))
      .toEqual(expect.arrayContaining(['RESULT']))
    expect(appendToSchema).toBeCalledTimes(1)
    expect(appendToSchema).toBeCalledWith({ a: true },additional)
  })

  it('asQueryStr makes isIn = query', () => {
    byModel(testModel[0],['a','b'],{ asQueryStr: true, params: ['b'] })
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

jest.mock('../../middleware/validate.middleware', () => 'checkValidation')

jest.mock('express-validator', () => ({
  ...jest.requireActual('express-validator'),
  checkSchema: jest.fn((r)=>[r])
}))

jest.mock('../../utils/validate.utils', () => ({
  ...jest.requireActual('../../utils/validate.utils'),
  toArraySchema: () => 'arraySchema'
}))

jest.mock('../../utils/common.utils', () => ({
  ...jest.requireActual('../../utils/common.utils'),
  filterDupes: jest.fn((o)=>o)
}))

jest.mock('../../services/model.services', () => ({
  ...jest.requireActual('../../services/model.services'),
  adaptSchemaEntry: jest.fn((obj) => obj),
}))

jest.mock('../../services/validate.services', () => ({
  ...jest.requireActual('../../services/validate.services'),
  generateSchema: jest.fn((key)=>({ [key]: true })),
  appendToSchema: jest.fn((obj) => obj),
}))