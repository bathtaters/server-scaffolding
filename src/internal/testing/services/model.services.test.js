const { getPrimaryIdAndAdaptSchema, runAdapters } = require('../../services/model.services')
const { defaultPrimary, defaultPrimaryType, adapterKey } = require('../../config/models.cfg')
const { parseTypeStr, dbFromType, htmlFromType, getAdapterFromType, setAdapterFromType } = require('../../utils/model.utils')
const { hasDupes } = require('../../utils/common.utils')


describe('getPrimaryIdAndAdaptSchema', () => {
  let schema
  beforeEach(() => { schema = { a: { type: 'typeA', isPrimary: true }, b: { type: 'typeB' } } })

  it('runs parseTypeStr if !type', () => {
    Object.keys(schema).forEach((key) => {
      schema[key].typeStr = schema[key].type
      delete schema[key].type
    })
    getPrimaryIdAndAdaptSchema(schema)
    expect(parseTypeStr).toBeCalledWith(schema.a)
    expect(parseTypeStr).toBeCalledWith(schema.b)
  })
  it('runs dbFromType if !db', () => {
    getPrimaryIdAndAdaptSchema(schema)
    expect(dbFromType).toBeCalledWith(schema.a)
    expect(dbFromType).toBeCalledWith(schema.b)
    expect(schema.a).toHaveProperty('db','dbFromType')
    expect(schema.b).toHaveProperty('db','dbFromType')
  })
  it('runs htmlFromType if !html', () => {
    schema.a.isPrimary = false // skips for primary key
    getPrimaryIdAndAdaptSchema(schema)
    expect(htmlFromType).toBeCalledWith(schema.a)
    expect(htmlFromType).toBeCalledWith(schema.b)
    expect(schema.a).toHaveProperty('html','htmlFromType')
    expect(schema.b).toHaveProperty('html','htmlFromType')
  })
  it('runs getAdapterFromType if !getAdapter', () => {
    getPrimaryIdAndAdaptSchema(schema)
    expect(getAdapterFromType).toBeCalledWith(schema.a)
    expect(getAdapterFromType).toBeCalledWith(schema.b)
    expect(schema.a).toHaveProperty(adapterKey.get,'getAdapterFromType')
    expect(schema.b).toHaveProperty(adapterKey.get,'getAdapterFromType')
  })
  it('runs setAdapterFromType if !setAdapter', () => {
    getPrimaryIdAndAdaptSchema(schema)
    expect(setAdapterFromType).toBeCalledWith(schema.a)
    expect(setAdapterFromType).toBeCalledWith(schema.b)
    expect(schema.a).toHaveProperty(adapterKey.set,'setAdapterFromType')
    expect(schema.b).toHaveProperty(adapterKey.set,'setAdapterFromType')
  })

  describe('primary key', () => {
    it('returns primary key', () => {
      expect(getPrimaryIdAndAdaptSchema(schema)).toBe('a')
    })
    it('adds default primary key if missing', () => {
      schema.a.isPrimary = false
      getPrimaryIdAndAdaptSchema(schema)
      expect(schema).toHaveProperty(defaultPrimary)
    })
    it('adds default primary type if missing', () => {
      delete schema.a.type
      getPrimaryIdAndAdaptSchema(schema)
      expect(schema.a).toHaveProperty('type', defaultPrimaryType.type)
    })
    it('skips html for primary key', () => {
      getPrimaryIdAndAdaptSchema(schema)
      expect(schema.a).not.toHaveProperty('html')
    })
    it('deletes isPrimary from settings', () => {
      getPrimaryIdAndAdaptSchema(schema)
      expect(schema.a).not.toHaveProperty('isPrimary')
    })
  })

  describe('errors', () => {
    it('multiple primary keys', () => {
      schema.b.isPrimary = true
      expect(() => getPrimaryIdAndAdaptSchema(schema, 'test'))
        .toThrowError('test has more than one primary ID: a, b')
    })

    it('no DB entries', () => {
      schema.a.db = null; schema.b.db = null
      expect(() => getPrimaryIdAndAdaptSchema(schema, 'test'))
        .toThrowError('DB schema for test was unable to be created or has no entries.')
    })

    it('duplicate keys (case insensitive)', () => {
      schema.A = { type: 'typeA' }
      hasDupes.mockReturnValueOnce(true)
      expect(() => getPrimaryIdAndAdaptSchema(schema, 'test'))
        .toThrowError('Definitions for test contain duplicate key names: a, b, A')
    })
  })
})


describe('runAdapters', () => {
  const schema = { a: {}, b: {testAdapter: jest.fn()}, c: {testAdapter: jest.fn()}, d: {testAdapter: jest.fn()}}
  it('passes non-objects', async () => {
    expect(await runAdapters('testAdapter', 'ab', schema)).toBe('ab')
    expect(await runAdapters('testAdapter', 1234, schema)).toBe(1234)
    expect(await runAdapters('testAdapter', true, schema)).toBe(true)
  })
  it('runs adapters for each key', async () => {
    let data = { a: 1, b: 2, c: 3 }
    await runAdapters('testAdapter', data, schema)
    expect(schema.b.testAdapter).toBeCalledWith(2, data)
    expect(schema.c.testAdapter).toBeCalledWith(3, data)
    expect(schema.d.testAdapter).not.toBeCalled()
  })
  it('assigns results to each key', async () => {
    let data = { a: 1, b: 2, c: 3 }
    schema.b.testAdapter.mockResolvedValueOnce('adaptB')
    schema.c.testAdapter.mockReturnValueOnce('adaptC')
    expect(await runAdapters('testAdapter', data, schema)).toEqual({
      a: 1, b: 'adaptB', c: 'adaptC'
    })
  })
  it('mutates & returns input object', async () => {
    let data = { a: 1, b: 2, c: 3 }
    schema.b.testAdapter.mockResolvedValueOnce('adaptB')
    schema.c.testAdapter.mockReturnValueOnce('adaptC')
    expect(await runAdapters('testAdapter', data, schema)).toBe(data)
    expect(data).toEqual({ a: 1, b: 'adaptB', c: 'adaptC' })
  })
  it('deletes each key in hideFields', async () => {
    let data = { a: 1, b: 2, c: 3, d: 4 }
    await runAdapters('testAdapter', data, schema, ['b','d'])
    expect(data).not.toHaveProperty('b')
    expect(data).not.toHaveProperty('e')
  })
})


// MOCKS

jest.mock('../../config/models.cfg', () => ({
  defaultPrimary: 'PRIMARY',
  defaultPrimaryType: { type: 'defaultPrimary' },
  adapterKey: { get: 'get', set: 'set' },
}))
jest.mock('../../utils/model.utils', () => ({
  parseTypeStr: jest.fn((s) => { s.type = 'parseTypeStr' }),
  dbFromType: jest.fn(() => 'dbFromType'),
  htmlFromType: jest.fn(() => 'htmlFromType'),
  getAdapterFromType: jest.fn(() => 'getAdapterFromType'),
  setAdapterFromType: jest.fn(() => 'setAdapterFromType'),
}))
jest.mock('../../utils/common.utils', () => ({ hasDupes: jest.fn(() => false) }))