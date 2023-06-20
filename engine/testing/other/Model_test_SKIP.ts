// TODO -- Update testing to match new Model class

import type { Page } from '../../types/Model.d'
import Model from '../../models/Model'
import * as services from '../../services/db.services'
import { openDb, getDb } from '../../libs/db'
import { adaptSchema, runAdapters } from '../../services/model.services'
import { checkInjection, appendAndSort, getArrayJoin } from '../../utils/db.utils'
import { mapToField } from '../../utils/common.utils'
import { isBool } from '../../utils/model.utils'
import { adapterTypes } from '../../types/Model'
import { ifExistsBehavior } from '../../config/models.cfg'
import * as errors from '../../config/errors.engine'

import { deepCopy } from '../test.utils'
const definitions = {
  defId: { type: 'int',     isPrimary: true },
  test:  { type: 'string',  default: 'DEFAULT' },
  data:  { type: 'boolean?' },
  obj:   { type: 'object[]' },
} as const

it.todo('batchUpdate/batchAdd')
it.todo('getArrayTable (+Model.url)')
it.todo('Generate Model.arrays (See Model.create)')
it.todo('Model.find: ordering & raw')
it.todo('Model.get with ID from array')
it.todo('Listeners')
it.todo('Adapters')
it.todo('Class Types')
it.todo('Where Values')
it.todo('Update Values')

describe('Model constructor', () => {
  let options = definitions
  beforeEach(() => { options = deepCopy(definitions) })
  
  it('sets object props to options', () => {
    const model = new Model('testModel', { ...options })
    expect(model.title).toBe('testModel')
    expect(model.url).toBe('testModel')
    expect(model.schema).toEqual(options)
    expect(model.primaryId).toBe('defId')
  })
  it('Checks title/primaryId/schema for injection', () => {
    const model = new Model('testModel', { ...options })
    expect(checkInjection).toBeCalledTimes(3)
    expect(checkInjection).toBeCalledWith('testModel')
    expect(checkInjection).toBeCalledWith('defId', model.title)
    expect(checkInjection).toBeCalledWith(options, model.title)
  })
  it('uses adaptSchema on definitions', () => {
    (adaptSchema as jest.Mock).mockReturnValueOnce('altID')
    const model = new Model('testModel', { ...options })
    expect(adaptSchema).toBeCalledTimes(1)
    expect(adaptSchema).toBeCalledWith(options, 'testModel', expect.anything())
    expect(model.primaryId).toBe('altID')
  })
  it('passes isArray Table to getPrimaryId & this.isChildModel', () => {
    const model1 = new Model('testModel', { ...options }, undefined, undefined, false)
    expect(adaptSchema).toBeCalledTimes(1)
    expect(adaptSchema).toBeCalledWith(expect.anything(), expect.anything(), false)
    expect(model1.isChildModel).toBe(false)
    ;
    (adaptSchema as jest.Mock).mockClear()
    const model2 = new Model('testModel', { ...options }, undefined, undefined, true)
    expect(adaptSchema).toBeCalledTimes(1)
    expect(adaptSchema).toBeCalledWith(expect.anything(), expect.anything(), true)
    expect(model2.isChildModel).toBe(true)
  })
  it('isInit resolves to true on success', () => {
    expect.assertions(1)
    return expect(new Model('testModel', { ...options }).isInitialized)
      .resolves.toBe(true)
  })
  it('runs this.create()', () => {
    expect.assertions(1)
    return new Model('testModel', { ...options }).isInitialized.then(() => {
      expect(services.reset).toBeCalledTimes(1)
    })
  })
  it('opens DB if closed', () => {
    expect.assertions(2)
    return new Model('testModel', { ...options }).isInitialized.then(() => {
      (getDb as jest.Mock).mockReturnValueOnce(null)
      expect(openDb).toBeCalledTimes(0)
      return new Model('testModel', { ...options }).isInitialized.then(() => {
        expect(openDb).toBeCalledTimes(1)
      })
    })
  })
  it('error when no definitions', () => {
    expect(() => new Model('testModel', {})).toThrowError()
  })
})


describe('Model create', () => {
  const TestModel = new Model('testModel', definitions)

  it('calls reset w/ expected args', () => {
    (mapToField as jest.Mock).mockReturnValueOnce('SCHEMA')
    expect.assertions(2)
    return TestModel.create(true).then(() => {
      expect(services.reset).toBeCalledTimes(1)
      expect(services.reset).toBeCalledWith(
        'DB', { testModel: 'SCHEMA' }, true, {}, {}
      )
    })
  })
  it('expected return on success', () => {
    expect.assertions(1)
    return TestModel.create().then((ret) => {
      expect(ret).toEqual({ success: true })
    })
  })
})


describe('Model get', () => {
  const TestModel = new Model('testModel', definitions)
  const postSanitizer = jest.spyOn<any, string>(TestModel, '_postDbSanitizer')

  it('calls get w/ ArrayJoin when ID', () => {
    expect.assertions(2)
    return TestModel.get('inp', { idKey: 'test' }).then(() => {
      expect(services.get).toBeCalledTimes(1)
      expect(services.get).toBeCalledWith(
        'DB', 'ArrayJoin', ['inp']
      )
    })
  })
  it('calls all w/ ArrayJoin when no ID', () => {
    expect.assertions(2)
    return TestModel.find().then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith('DB', 'ArrayJoin')
    })
  })
  it('sends input to ArrayJoin', () => {
    expect.assertions(2)
    return TestModel.get('inp', { idKey: 'test' }).then(() => {
      expect(getArrayJoin).toBeCalledTimes(1)
      expect(getArrayJoin).toBeCalledWith(
        TestModel, [], { id: 'inp', idKey: 'test', idIsArray: false }
      )
    })
  })
  it('returns result when ID', () => {
    expect.assertions(1)
    return TestModel.get('inp', { idKey: 'test' }).then((ret) => {
      expect(ret).toHaveProperty('val', 'GET')
    })
  })
  it('returns result array when no ID', () => {
    expect.assertions(1)
    return TestModel.find().then((ret) => {
      expect(ret).toEqual(['ALL','RES'])
    })
  })
  it('uses getAdapter', () => {
    expect.assertions(2)
    return TestModel.get('inp', { idKey: 'test' }).then(() => {
      expect(runAdapters).toBeCalledTimes(1)
      expect(runAdapters).toBeCalledWith(
        adapterTypes.fromDB,
        expect.objectContaining({ val: 'GET' }),
        TestModel,
      )
    })
  })
  it('skips getAdapter when raw = true', () => {
    expect.assertions(1)
    return TestModel.get('inp', { idKey: 'test', raw: true }).then(() => {
      expect(runAdapters).toBeCalledTimes(0)
    })
  })
  it('returns case-insensitive object', () => {
    postSanitizer.mockReturnValueOnce('CASEI')
    expect.assertions(2)
    return TestModel.get('inp', { idKey: 'test' }).then((ret) => {
      expect(postSanitizer).toBeCalledTimes(1)
      expect(ret).toBe('CASEI')
    })
  })
  it('returns case-insensitive object array', () => {
    postSanitizer.mockReturnValueOnce('CASEI').mockReturnValueOnce('CASEB')
    expect.assertions(2)
    return TestModel.find().then((ret) => {
      expect(postSanitizer).toBeCalledTimes(2)
      expect(ret).toEqual(['CASEI','CASEB'])
    })
  })
})


describe('Model getPage', () => {
  const TestModel = new Model('testModel', definitions)
  const postSanitizer = jest.spyOn<any, string>(TestModel, '_postDbSanitizer')

  it('uses arrayJoin SQL + Limit/Offset', () => {
    expect.assertions(2)
    return TestModel.find(undefined, undefined, { page: 6, size: 12 }).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith(
        'DB', 'ArrayJoin LIMIT ? OFFSET ?',
        [12, 60]
      )
    })
  })
  it('orders result based on input', () => {
    expect.assertions(1)
    return TestModel.find(undefined, undefined, { page: 6, size: 12, sort: 'data', desc: true }).then(() => {
      expect(services.all).toBeCalledWith(
        expect.anything(),
        'ArrayJoin ORDER BY testModel.data DESC LIMIT ? OFFSET ?',
        [12, 60]
      )
    })
  })
  it('uses default on missing orderKey', () => {
    expect.assertions(1)
    return TestModel.find(undefined, undefined, { page: 6, size: 12, desc: false }).then(() => {
      expect(services.all).toBeCalledWith(
        expect.anything(),
        expect.stringContaining('ORDER BY testModel.defId ASC'),
        expect.any(Array)
      )
    })
  })
  it('error if orderKey not in Schema', async () => {
    expect.assertions(1)
    return TestModel.find(undefined, undefined, { page: 6, size: 12, sort: 'badKey' as any }).catch((err) => {
      expect(err).toEqual(errors.badKey('badKey',TestModel.title))
    })
  })
  it('returns result array on success', () => {
    expect.assertions(1)
    return TestModel.find(undefined, undefined, { page: 6, size: 12 }).then((ret) => {
      expect(ret).toEqual(['ALL','RES'])
    })
  })
  it('uses getAdapter', () => {
    expect.assertions(3)
    return TestModel.find(undefined, undefined, { page: 6, size: 12 }).then(() => {
      expect(runAdapters).toBeCalledTimes(2)
      expect(runAdapters).toBeCalledWith(adapterTypes.fromDB, 'ALL', TestModel)
      expect(runAdapters).toBeCalledWith(adapterTypes.fromDB, 'RES', TestModel)
    })
  })
  it('returns case-insensitive objects', () => {
    postSanitizer.mockReturnValueOnce('CASEI').mockReturnValueOnce('CASEB')
    expect.assertions(2)
    return TestModel.find(undefined, undefined, { page: 6, size: 12 }).then((ret) => {
      expect(postSanitizer).toBeCalledTimes(2)
      expect(ret).toEqual(['CASEI','CASEB'])
    })
  })
  it('rejects on missing size', () => {
    expect.assertions(1)
    return TestModel.find(undefined, undefined, { page: 6, size: 0 }).catch((err) => {
      expect(err).toEqual(errors.noSize())
    })
  })
})


describe('Model find', () => {
  const TestModel = new Model('testModel', definitions)
  const preSanitizer  = jest.spyOn<any, string>(TestModel, '_preDBsanitize')
  const postSanitizer = jest.spyOn<any, string>(TestModel, '_postDbSanitizer')

  it('uses expected SQL', () => {
    expect.assertions(2)
    return TestModel.find({ data: true, test: 'xld' }).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith(
        'DB', 'ArrayJoin WHERE testModel.data = ? AND testModel.test = ?', [true, 'xld']
      )
    })
  })
  it('allows partial match', () => {
    expect.assertions(2)
    return TestModel.find({ test: { $in: '1' } }).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith(
        expect.anything(), expect.stringContaining('WHERE testModel.test LIKE ?'), ['%1%']
      )
    })
  })
  it('allows partial bitmap match', () => {
    expect.assertions(2)
    return TestModel.find({ defId: { $in: 3 } }).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith(
        expect.anything(), expect.stringContaining('WHERE testModel.defId & ?'), [3]
      )
    })
  })
  it('partial bitmap matches zero', () => {
    expect.assertions(2)
    return TestModel.find({ defId: { $in: 0 } }).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith(
        expect.anything(), expect.stringContaining('WHERE testModel.defId = ?'), [0]
      )
    })
  })
  it('partial boolean converts to int', () => {
    (isBool as jest.Mock).mockReturnValueOnce(true)
    expect.assertions(2)
    return TestModel.find({ data: { $in: true } }).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith(
        expect.anything(), expect.stringContaining('WHERE testModel.data = ?'), [1]
      )
    })
  })
  it('forces exact match on null', () => {
    expect.assertions(2)
    return TestModel.find({ data: { $in: null } }).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith(
        expect.anything(), expect.stringContaining('WHERE testModel.data = ?'), [null]
      )
    })
  })
  it('forces exact match to stringified object/array', () => {
    expect.assertions(2)
    return TestModel.find({ obj: { $in: [{a:1,b:2},{c:3}] } }).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith(
        expect.anything(), expect.stringContaining('WHERE testModel.obj = ?'), ['[{"a":1,"b":2},{"c":3}]']
      )
    })
  })
  it('returns result array on success', () => {
    expect.assertions(1)
    return TestModel.find({ data: true }).then((ret) => {
      expect(ret).toEqual(['ALL','RES'])
    })
  })
  it('uses set/getAdapters', () => {
    expect.assertions(4)
    return TestModel.find({ data: true }).then(() => {
      expect(runAdapters).toBeCalledTimes(3)
      expect(runAdapters).toBeCalledWith(adapterTypes.fromDB, 'ALL', TestModel)
      expect(runAdapters).toBeCalledWith(adapterTypes.fromDB, 'RES', TestModel)
      expect(runAdapters).toBeCalledWith(adapterTypes.toDB, {data: true}, TestModel)
    })
  })
  it('sanitizes input data', () => {
    expect.assertions(2)
    return TestModel.find({ data: true }).then(() => {
      expect(preSanitizer).toBeCalledTimes(1)
      expect(preSanitizer).toBeCalledWith({ data: true }, TestModel)
    })
  })
  it('returns case-insensitive objects', () => {
    postSanitizer.mockReturnValueOnce('CASEI').mockReturnValueOnce('CASEB')
    expect.assertions(2)
    return TestModel.find({ data: true }).then((ret) => {
      expect(postSanitizer).toBeCalledTimes(2)
      expect(ret).toEqual(['CASEI','CASEB'])
    })
  })
  it('rejects on no data', () => {
    expect.assertions(1)
    return TestModel.find({}).catch((err) => {
      expect(err).toEqual(errors.noData())
    })
  })
})


describe('Model count', () => {
  const TestModel = new Model('testModel', definitions)

  it('uses expected SQL', () => {
    expect.assertions(2)
    return TestModel.count({ test: 'inp' }).then(() => {
      expect(services.get).toBeCalledTimes(1)
      expect(services.get).toBeCalledWith(
        'DB',
        expect.stringMatching(/SELECT COUNT\(\*\) as \w+ FROM testModel WHERE test = \?/),
        ['inp']
      )
    })
  })
  it('gets all when no ID', () => {
    expect.assertions(2)
    return TestModel.count().then(() => {
      expect(services.get).toBeCalledTimes(1)
      expect(services.get).toBeCalledWith(
        'DB', expect.stringMatching(/SELECT COUNT\(\*\) as \w+ FROM testModel/), []
      )
    })
  })
  it('uses defaults on missing idKey', () => {
    expect.assertions(1)
    return TestModel.count('inp').then(() => {
      expect(services.get).toBeCalledWith(
        expect.anything(), expect.stringContaining('WHERE defId = ?'), expect.anything()
      )
    })
  })
  it('returns count on success', () => {
    expect.assertions(1)
    return TestModel.count().then((ret) => {
      expect(ret).toBe(15)
    })
  })
})


it.todo('Model add')

describe('Model batchAdd', () => {
  const TestModel = new Model('testModel', definitions)
  const preSanitizer  = jest.spyOn<any, string>(TestModel, '_preDBsanitize')

  it('uses expected SQL for solo entry', () => {
    expect.assertions(2)
    return TestModel.addAndReturn([{ defId: 1, test: '2' }]).then(() => {
      expect(services.run).toBeCalledTimes(1)
      expect(services.run).toBeCalledWith(
        'DB', 'INSERT INTO testModel(defId,test) VALUES (?,?)',
        [1,'2'], expect.anything()
      )
    })
  })
  it('uses expected SQL for multi entries', () => {
    expect.assertions(2)
    return TestModel.addAndReturn([{ defId: 1, test: '2' }, { defId: 3, test: '4' }]).then(() => {
      expect(services.run).toBeCalledTimes(1)
      expect(services.run).toBeCalledWith(
        'DB', 'INSERT INTO testModel(data,test) VALUES (?,?),(?,?)',
        [1,'2',3,'4'], expect.anything()
      )
    })
  })
  it('uses defaults on missing input fields', () => {
    expect.assertions(1)
    return TestModel.addAndReturn([{ defId: 1 }, { defId: 2 }]).then(() => {
      expect(services.run).toBeCalledWith(
        expect.anything(),
        expect.stringContaining('(defId,test)'),
        [1,'DEFAULT',2,'DEFAULT'],
        expect.anything()
      )
    })
  })
  it('uses ifExistsBehavior from config', () => {
    expect.assertions(1)
    return TestModel.addAndReturn([{ defId: 1 }, { defId: 2 }], 'skip').then(() => {
      expect(services.run).toBeCalledWith(
        expect.anything(),
        expect.stringContaining(ifExistsBehavior.skip),
        expect.anything(),
        expect.anything()
      )
    })
  })
  it('returns on success', () => {
    (services.run as jest.Mock).mockResolvedValueOnce({ lastId: 123 })
    expect.assertions(1)
    return TestModel.add([{ defId: 1 }, { defId: 2 }]).then((ret) => {
      expect(ret).toEqual({ changed: 2 })
    })
  })
  it('returns LastEntry on success', () => {
    expect.assertions(1)
    return TestModel.addAndReturn([{ defId: 1 }, { defId: 2 }]).then((ret) => {
      expect(ret).toEqual({ val: 'GET', c: 15 })
      expect(services.run).toBeCalledTimes(1)
      expect(services.get).toBeCalledTimes(1)
    })
  })
  it('uses setAdapter on input', () => {
    expect.assertions(3)
    return TestModel.add([{ defId: 1 }, { defId: 2 }]).then(() => {
      expect(runAdapters).toBeCalledWith(adapterTypes.toDB, { defId: 1 }, TestModel)
      expect(runAdapters).toBeCalledWith(adapterTypes.toDB, { defId: 2 }, TestModel)
      expect(runAdapters).toBeCalledTimes(2)
    })
  })
  it('sanitizes input data', () => {
    expect.assertions(3)
    return TestModel.add([{ defId: 1 }, { defId: 2 }]).then(() => {
      expect(preSanitizer).toBeCalledWith({ defId: 1 }, TestModel)
      expect(preSanitizer).toBeCalledWith({ defId: 2 }, TestModel)
      expect(preSanitizer).toBeCalledTimes(2)
    })
  })
  it.todo('rejects on no data & no defaults')
})


describe('Model update', () => {
  const TestModel = new Model('testModel', definitions)
  const preSanitizer  = jest.spyOn<any, string>(TestModel, '_preDBsanitize')

  it('uses expected SQL', () => {
    expect.assertions(2)
    return TestModel.update('inp', { defId: 1, data: false }, { idKey: 'test' }).then(() => {
      expect(services.run).toBeCalledTimes(1)
      expect(services.run).toBeCalledWith('DB',
        expect.stringMatching(/^UPDATE testModel SET defId = \?, data = \?\s+WHERE test = \?$/),
        [1, false, 'inp']
      )
    })
  })
  it('uses default on missing idKey', () => {
    expect.assertions(1)
    return TestModel.update(1, { data: true }).then(() => {
      expect(services.run).toBeCalledWith(
        expect.anything(), expect.stringContaining('WHERE defId = ?'), expect.anything()
      )
    })
  })
  it('expected return on success', () => {
    expect.assertions(1)
    return TestModel.update('1', { data: true }, { idKey: 'test' }).then((ret) => {
      expect(ret).toEqual({ changed: 1 })
    })
  })
  it('uses setAdapter on data & ID', () => {
    expect.assertions(3)
    return TestModel.update('1', { data: true }, { idKey: 'test' }).then(() => {
      expect(runAdapters).toBeCalledTimes(2)
      expect(runAdapters).toBeCalledWith(adapterTypes.toDB, { data: true }, TestModel)
      expect(runAdapters).toBeCalledWith(adapterTypes.toDB, { test: '1'  }, TestModel)
    })
  })
  it('sanitizes input data', () => {
    expect.assertions(3)
    return TestModel.update('1', { data: true }, { idKey: 'test' }).then(() => {
      expect(preSanitizer).toBeCalledTimes(2)
      expect(preSanitizer).toBeCalledWith({ data: true }, TestModel)
      expect(preSanitizer).toBeCalledWith({ test: '1 ' }, TestModel)
    })
  })
  it('rejects on missing ID', async () => {
    await TestModel.find({})
    expect.assertions(1)
    return TestModel.update(null, { data: true }).catch((err) => {
      expect(err).toEqual(errors.noID())
    })
  })
  it('rejects on no data', async () => {
    await TestModel.find({})
    expect.assertions(1)
    return TestModel.update(1, {}).catch((err) => {
      expect(err).toEqual(errors.noData())
    })
  })
  it.todo('rejects on ID not found')
})


describe('Model remove', () => {
  // NOTE: Requires service.get() in Model.count() to return truthy (See mock below)
  const TestModel = new Model('testModel', definitions)

  const countSpy = jest.spyOn(TestModel, 'count')
  afterAll(() => { countSpy.mockRestore() })

  it('uses expected SQL', () => {
    expect.assertions(2)
    return TestModel.remove('inp','test').then(() => {
      expect(services.run).toBeCalledTimes(1)
      expect(services.run).toBeCalledWith(
        'DB', 'DELETE FROM testModel WHERE test = ?', ['inp']
      )
    })
  })
  it('uses default on missing idKey', () => {
    expect.assertions(1)
    return TestModel.remove(123).then(() => {
      expect(services.run).toBeCalledWith(
        expect.anything(), expect.stringContaining('WHERE defId = ?'), expect.anything()
      )
    })
  })
  it('expected return on success', () => {
    (services.run as jest.Mock).mockResolvedValueOnce({ changes: 123 })
    expect.assertions(1)
    return TestModel.remove('inp','test').then((ret) => {
      expect(ret).toEqual({ changed: 123 })
    })
  })
  it('rejects on missing ID', () => {
    expect.assertions(1)
    return TestModel.remove(null, 'data').catch((err) => {
      expect(err).toEqual(errors.noID())
    })
  })
  it('rejects on ID not found', () => {
    countSpy.mockResolvedValueOnce(0)
    expect.assertions(1)
    return TestModel.remove('inp', 'test').catch((err) => {
      expect(err).toEqual(errors.noEntry('inp'))
    })
  })
})


describe('Model custom', () => {
  const TestModel = new Model('testModel', definitions)
  const postSanitizer = jest.spyOn<any, string>(TestModel, '_postDbSanitizer')

  it('uses input SQL', () => {
    expect.assertions(2)
    return TestModel.custom('SQL',['PARAMS'],false).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith('DB', 'SQL', expect.anything())
    })
  })
  it('uses input PARAMS', () => {
    expect.assertions(2)
    return TestModel.custom('SQL',['PARAMS'],false).then(() => {
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith('DB', expect.anything(), ['PARAMS'])
    })
  })
  it('returns result array on success', () => {
    expect.assertions(1)
    return TestModel.custom('SQL',['PARAMS'],false).then((ret) => {
      expect(ret).toEqual(['ALL','RES'])
    })
  })
  it('uses getAdapter', () => {
    expect.assertions(3)
    return TestModel.custom('SQL',['PARAMS'],false).then(() => {
      expect(runAdapters).toBeCalledTimes(2)
      expect(runAdapters).toBeCalledWith(adapterTypes.fromDB, 'ALL', TestModel)
      expect(runAdapters).toBeCalledWith(adapterTypes.fromDB, 'RES', TestModel)
    })
  })
  it('skips getAdapter when raw = true', () => {
    expect.assertions(1)
    return TestModel.custom('SQL',['PARAMS'],true).then(() => {
      expect(runAdapters).toBeCalledTimes(0)
    })
  })
  it('returns case-insensitive objects', () => {
    postSanitizer.mockReturnValueOnce('CASEI').mockReturnValueOnce('CASEB')
    expect.assertions(2)
    return TestModel.custom('SQL',['PARAMS'],false).then((ret) => {
      expect(postSanitizer).toBeCalledTimes(2)
      expect(ret).toEqual(['CASEI','CASEB'])
    })
  })
})


describe('Model getPaginationData', () => {
  // NOTE: Requires service.get() in Model.count() to return > page*size (See mock below)
  const TestModel = new Model('testModel', definitions)
  
  let input: Page.Select<typeof definitions>, options: Page.Options
  beforeEach(() => {
    input = { page: 3, size: 4 }
    options = { defaultSize: 5, sizeList: [2,4,6], startPage: 1 }
  })

  it('passes size to return', () => {
    expect.assertions(1)
    return TestModel.getPageData(input, options).then(({ size }) => {
      expect(size).toBe(4)
    })
  })
  it('passes page to return if in range', () => {
    expect.assertions(1)
    return TestModel.getPageData(input, options).then(({ page }) => {
      expect(page).toBe(3)
    })
  })
  it('calculates pageCount using Model.count', () => {
    (services.get as jest.Mock).mockResolvedValueOnce({ c: 48 }) // Model.count => 48
    expect.assertions(1)
    return TestModel.getPageData(input, options).then(({ pageCount }) => {
      expect(pageCount).toBe(12)
    })
  })
  it('returns sorted sizeList w/ size appended', () => {
    (appendAndSort as jest.Mock).mockImplementationOnce(() => 'SORTED')
    expect.assertions(2)
    return TestModel.getPageData(input, options).then(({ sizes }) => {
      expect(sizes).toBe('SORTED')
      expect(appendAndSort).toBeCalledWith([2, 4, 6], 4)
    })
  })
  it('uses Model.getPage to return data', () => {
    expect.assertions(3)
    return TestModel.getPageData(input, options).then(({ data }) => {
      expect(data).toEqual(['ALL','RES'])
      expect(services.all).toBeCalledTimes(1)
      expect(services.all).toBeCalledWith(
        // Model.getPage(page:3, size:4) (LIMIT = size, OFFSET = (page - 1) * size)
        expect.anything(), expect.stringContaining('LIMIT ? OFFSET ?'),
        expect.arrayContaining([4,8])
      )
    })
  })

  it('uses startPage when no page', () => {
    input.page = 0
    options.startPage = 2
    expect.assertions(1)
    return TestModel.getPageData(input, options).then(({ page }) => {
      expect(page).toBe(2)
    })
  })
  it('limits page to min 1', () => {
    input.page = -12
    expect.assertions(1)
    return TestModel.getPageData(input, options).then(({ page }) => {
      expect(page).toBe(1)
    })
  })
  it('limits page to max pageCount', () => {
    (services.get as jest.Mock).mockResolvedValueOnce({ c: 7 }) // Model.count => 7
    expect.assertions(1)
    return TestModel.getPageData(input, options).then(({ page }) => {
      expect(page).toBe(2)
    })
  })
  it('uses defaultSize when no size', () => {
    input.size = 0
    expect.assertions(1)
    return TestModel.getPageData(input, options).then(({ size }) => {
      expect(size).toBe(5)
    })
  })
  it('no sizes if pageCount = 1 & total <= all sizes', () => {
    (services.get as jest.Mock).mockResolvedValueOnce({ c: 5 }) // Model.count => 5
    input.size = 6
    options.sizeList = [10, 15, 20]
    expect.assertions(1)
    return TestModel.getPageData(input, options).then(({ sizes }) => {
      expect(sizes).toBeFalsy()
    })
  })
})



/* --- MOCKS --- */

jest.mock('../../libs/db', () => ({
  getDb: jest.fn(() => 'DB'), openDb: jest.fn().mockResolvedValue(true)
}))

jest.mock('../../services/db.services', () => ({
  run:   jest.fn((db) => db ? Promise.resolve({}) : Promise.reject('No DB')),
  get:   jest.fn((db) => db ? Promise.resolve({ val: 'GET', c: 15 }) : Promise.reject('No DB')),
  all:   jest.fn((db) => db ? Promise.resolve(['ALL','RES']) : Promise.reject('No DB')),
  reset: jest.fn((db) => db ? Promise.resolve({}) : Promise.reject('No DB')),
}))

jest.mock('../../services/model.services', () => ({
  adaptSchema: jest.fn(() => 'defId'),
  runAdapters: jest.fn((_,data) => data),
  extractArrays: jest.fn(() => ({})),
}))

jest.mock('../../utils/db.utils', () => ({
  checkInjection: jest.fn((o) => o),
  appendAndSort: jest.fn((list) => list),
  getArrayJoin: jest.fn(() => 'ArrayJoin'),
}))

jest.mock('../../utils/common.utils', () => ({
  createCaseInsensitiveCopier: () => (o: any) => o,
  mapToField: jest.fn((o) => o),
}))

jest.mock('../../utils/model.utils', () => ({
  isBool: jest.fn(() => false),
  createSchemaSanitizer: () => (o: any) => o,
  arrayTableRefs: jest.fn(() => 'arrayTableRefs'),
}))

jest.mock('../../utils/validate.utils', () => ({ parseBoolean: () => (val: any) => !!val }))
jest.mock('../../config/models.cfg', () => ({
  adapterKey: { get: 'get', set: 'set' },
  ifExistsBehavior: { default: '', test: ' IF EXISTS BEHAVIOR' },
  arrayLabel: { foreignId: 'foreign', index: 'index', entry: 'entry' },
  getArrayName: (...args: string[]) => args.join(':'),
  getArrayPath: () => 'ArrayPath',
  CONCAT_DELIM: '!'
}))