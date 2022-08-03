const logErrSpy = jest.spyOn(require('../../libs/log'), 'error')
const {
  getAdapter, setAdapter, addAdapter, guiAdapter,
  preValidateAdapter, adminFormAdapter, userFormAdapter
} = require('../../services/users.services')
const { modelAccessToInts, decodeCors, displayCors } = require('../../utils/users.utils')
const { formatLong } = require('../../libs/date')
const errors = require('../../config/errors.internal')


let testObj

describe('User getAdapter', () => {
  beforeEach(() => { testObj = {
    models: '{"a":1,"b":2,"c":3}',
    key: 'KEY',
    cors: 'CORS',
  } })

  it('parses models JSON', () => {
    expect(getAdapter(testObj)).toHaveProperty('models', { a: 1, b: 2, c: 3 })
  })
  it('decodes cors', () => {
    expect(getAdapter(testObj)).toHaveProperty('cors', 'decodeCors:CORS')
  })
  it('masks password key', () => {
    const result = getAdapter(testObj)
    expect(result).toHaveProperty('password', true)
    expect(result).not.toHaveProperty('key')
  })
  it('Catches & avoids throwing errors', () => {
    expect(getAdapter(testObj).hadError).toBeFalsy()
    expect(logErrSpy).toBeCalledTimes(0)
    decodeCors.mockImplementationOnce(() => { throw 'TEST ERROR' })
    expect(getAdapter(testObj).hadError).toBeTruthy()
    expect(logErrSpy).toBeCalledTimes(1)
    expect(logErrSpy).toBeCalledWith('TEST ERROR')
  })
})

describe('User setAdapter', () => {
  beforeEach(() => { testObj = {
    models: 'MODELS',
    access: 'ACCESS',
    cors: 'CORS',
    username: 'UNAME',
    password: 'PASSWORD',
  } })

  it('runs models through modelAccessToInts', async () => {
    expect(await setAdapter(testObj)).toHaveProperty('models','"modelAccessToInts:MODELS"')
  })
  it('defaults models to {}', async () => {
    modelAccessToInts.mockReturnValueOnce(null)
    expect(await setAdapter(testObj)).toHaveProperty('models','{}')
  })
  it('encodes access', async () => {
    expect(await setAdapter(testObj)).toHaveProperty('access','accessInt:ACCESS')
  })
  it('encodes cors', async () => {
    expect(await setAdapter(testObj)).toHaveProperty('cors','encodeCors:CORS')
  })
  it('normalizes username', async () => {
    expect(await setAdapter(testObj)).toHaveProperty('username','uname')
  })
  it('encodes password', async () => {
    const result = await setAdapter(testObj)
    expect(result).toHaveProperty('key','encodePassword:PASSWORD')
    expect(result).toHaveProperty('salt','encodeSalt')
    expect(result).not.toHaveProperty('password')
  })
})

describe('User addAdapter', () => {
  it('generates token', () => {
    expect(addAdapter({})).toHaveProperty('token','generateToken')
  })
  it('generates id token', () => {
    expect(addAdapter({}, 'id')).toHaveProperty('id','generateToken')
  })
  it('uses custom id key', () => {
    const result = addAdapter({}, 'test123')
    expect(result).toHaveProperty('test123')
    expect(result).not.toHaveProperty('id')
  })
  it('uses defaults', () => {
    const result = addAdapter({})
    expect(result).toHaveProperty('username','usernameDefault')
    expect(result).toHaveProperty('access','accessDefault')
    expect(result).toHaveProperty('cors','corsDefault')
    expect(result).toHaveProperty('models','modelsDefault')
  })
})

describe('User guiAdapter', () => {
  const dateCountRegex = /^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} [AP]M \[\d+\]$$/
  beforeEach(() => { testObj = {
    models: 'MODELS',
    access: 'ACCESS',
    cors: 'CORS',
    guiCount:  11,
    apiCount:  23,
    failCount: 2,
    guiTime:  '2022-03-04T05:06:07',
    apiTime:  '2021-02-13T14:25:36',
    failTime: '2022-06-21T12:16:41',
  } })

  it('decodes access', () => {
    expect(guiAdapter(testObj)).toHaveProperty('access', 'accessArray, ACCESS')
  })
  it('stringifys models', () => {
    expect(guiAdapter(testObj)).toHaveProperty('models', 'getModelsString:MODELS')
  })
  it('formats dates', () => {
    let result = guiAdapter(testObj)
    expect(formatLong).toBeCalledTimes(3)
    expect(formatLong).toBeCalledWith('2022-03-04T05:06:07')
    expect(formatLong).toBeCalledWith('2021-02-13T14:25:36')
    expect(formatLong).toBeCalledWith('2022-06-21T12:16:41')
    expect(result).toHaveProperty('guiTime',  'FMT_LONG [11]')
    expect(result).toHaveProperty('apiTime',  'FMT_LONG [23]')
    expect(result).toHaveProperty('failTime', 'FMT_LONG [2]')
  })
  it('decodes cors', () => {
    expect(guiAdapter(testObj)).toHaveProperty('cors', 'displayCors:CORS')
  })
  it('gets cors props', () => {
    const result = guiAdapter(testObj)
    expect(result).toHaveProperty('regExCors', 'isRegEx:CORS')
    expect(result).toHaveProperty('arrayCors', false)
    testObj.cors = [1,2,3]
    expect(guiAdapter(testObj)).toHaveProperty('arrayCors', true)
  })
  it('array adapts each entry', () => {
    expect(guiAdapter([{ access: 'ACC' }, { models: 'MODS' }])).toEqual([
      expect.objectContaining({ access: 'accessArray, ACC' }),
      expect.objectContaining({ models: 'getModelsString:MODS' }),
    ])
  })
  it('null returns empty array', () => {
    expect(guiAdapter(null)).toEqual([])
    expect(guiAdapter()).toEqual([])
  })
  it('Catches & avoids throwing errors', () => {
    expect(guiAdapter(testObj).hadError).toBeFalsy()
    expect(logErrSpy).toBeCalledTimes(0)
    displayCors.mockImplementationOnce(() => { throw 'TEST ERROR' })
    expect(guiAdapter(testObj).hadError).toBeTruthy()
    expect(logErrSpy).toBeCalledTimes(1)
    expect(logErrSpy).toBeCalledWith('TEST ERROR')
  })
})

describe('User pre-validateAdapter', () => {
  beforeEach(() => { testObj = {
    models: 'a,b,c',
    access: '1,2,3',
    searchA: 'keep only this',
    searchB: 'and this',
  } })

  it('search removes non-searchable keys in users.cfg', () => {
    expect(preValidateAdapter(testObj, true)).toEqual({
      searchA: 'keep only this', searchB: 'and this',
    })
  })
})

describe('Admin form adapter', () => {
  beforeEach(() => { testObj = {
    models: 'MODELS',
    password: '123',
    confirm: '123',
  } })

  it('encode models array', () => {
    expect(adminFormAdapter(testObj)).toHaveProperty('models','modelsArrayToObj:MODELS')
  })
  it('removes confirm field', () => {
    expect(adminFormAdapter(testObj,1,'Add')).not.toHaveProperty('confirm')
  })
  it('passwords don\'t match', () => {
    testObj.confirm = '1234'
    expect(() => adminFormAdapter(testObj,1,'Add')).toThrowError(errors.badConfirm())
  })
  it('missing confirm', () => {
    testObj.confirm = ''
    expect(() => adminFormAdapter(testObj,1,'Update')).toThrowError(errors.noConfirm())
  })
})

describe('User form adapter', () => {
  const user = { id: 'test' }
  beforeEach(() => { testObj = {
    id: 'test',
    models: 'MODELS',
    password: '123',
    confirm: '123',
  } })

  it('blocks user from modifying other user', () => {
    expect(() => userFormAdapter(testObj,{})).toThrowError(errors.modifyOther())
  })
  it('removes confirm field', () => {
    expect(userFormAdapter(testObj,user,'Add')).not.toHaveProperty('confirm')
  })
  it('passwords don\'t match', () => {
    testObj.confirm = '1234'
    expect(() => userFormAdapter(testObj,user,'Add')).toThrowError(errors.badConfirm())
  })
  it('missing confirm', () => {
    testObj.confirm = ''
    expect(() => userFormAdapter(testObj,user,'Update')).toThrowError(errors.noConfirm())
  })
})


// MOCKS

jest.mock('../../libs/date', () => ({ formatLong: jest.fn(() => 'FMT_LONG') }))
jest.mock('../../utils/users.utils', () => ({
  accessArray: (access) => ['accessArray', access],
  accessInt: (access) => 'accessInt:'+access,
  decodeCors: jest.fn((cors) => 'decodeCors:'+cors),
  encodeCors: (cors) => 'encodeCors:'+cors,
  displayCors: jest.fn((cors) => 'displayCors:'+cors),
  isRegEx: (cors) => 'isRegEx:'+cors,
  hasAccess: () => false,
  getModelsString: (models) => 'getModelsString:'+models,
  modelsArrayToObj: (models) => 'modelsArrayToObj:'+models,
  modelAccessToInts: jest.fn((models) => 'modelAccessToInts:'+models),
}))
jest.mock('../../utils/auth.utils', () => ({
  generateToken: () => 'generateToken',
  encodePassword: (password) => Promise.resolve({ key: 'encodePassword:'+password, salt: 'encodeSalt' })
}))
jest.mock('../../config/users.cfg', () => ({
  access: {},
  searchableKeys: ['searchA','searchB'],
  definitions: { defaults: {
    username: 'usernameDefault',
    access: 'accessDefault',
    models: 'modelsDefault',
    cors: 'corsDefault',
  }}
}))