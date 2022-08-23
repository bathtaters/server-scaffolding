const logErrSpy = jest.spyOn(require('../../libs/log'), 'error')
const {
  initAdapters, addAdapter, guiAdapter,
  adminFormAdapter, userFormAdapter
} = require('../../services/users.services')
const {
  modelAccessToInts, accessInt, 
  encodeCors, decodeCors, displayCors,
} = require('../../utils/users.utils')
const { encodePassword } = require('../../utils/auth.utils')
const { formatLong } = require('../../libs/date')
const errors = require('../../config/errors.engine')
const { adapterKey } = require('../../config/models.cfg')


let testObj

describe('User initAdapters', () => {
  let defs = { pwkey: {}, access: {}, cors: {}, username: {}, password: {}, models: {} }
  beforeAll(() => { initAdapters(defs) })

  it('adds adapters to each key', () => {
    expect(defs.pwkey   ).toHaveProperty(adapterKey.get, expect.any(Function))
    expect(defs.cors    ).toHaveProperty(adapterKey.get, expect.any(Function))
    expect(defs.models  ).toHaveProperty(adapterKey.get, expect.any(Function))
    expect(defs.access  ).toHaveProperty(adapterKey.set, expect.any(Function))
    expect(defs.cors    ).toHaveProperty(adapterKey.set, expect.any(Function))
    expect(defs.username).toHaveProperty(adapterKey.set, expect.any(Function))
    expect(defs.password).toHaveProperty(adapterKey.set, expect.any(Function))
    expect(defs.models  ).toHaveProperty(adapterKey.set, expect.any(Function))
  })

  it('pwkey getAdapter adds password prop', () => {
    let data
    defs.pwkey[adapterKey.get]('test', data = {})
    expect(data).toHaveProperty('password', true)
    defs.pwkey[adapterKey.get](  null, data = {})
    expect(data).toHaveProperty('password', false)
  })
  it('cors getAdapter uses decodeCors', () => {
    expect(defs.cors[adapterKey.get]('corsIn')).toBe('decodeCors')
    expect(decodeCors).toBeCalledWith('corsIn')
  })
  describe('models getAdapter', () => {
    it('parses JSON', () => {
      expect(defs.models[adapterKey.get]([{a:1},{a:2,b:3}])).toEqual([{a:1},{a:2,b:3}])
    })
    it('passes non-string', () => {
      expect(defs.models[adapterKey.get]([{a:1},{a:2,b:3}])).toEqual([{a:1},{a:2,b:3}])
    })
    it('defaults to empty array', () => {
      expect(defs.models[adapterKey.get]()).toEqual([])
      expect(defs.models[adapterKey.get]('')).toEqual([])
      expect(defs.models[adapterKey.get](null)).toEqual([])
    })
    it('absorbs JSON parse error', () => {
      expect(defs.models[adapterKey.get](',illegal!')).toBe('<ERROR>')
      expect(logErrSpy).toBeCalledTimes(1)
    })
  })

  it('access setAdapter uses accessInt', () => {
    expect(defs.access[adapterKey.set]('accessIn')).toBe('accessInt')
    expect(accessInt).toBeCalledWith('accessIn')
  })
  it('cors setAdapter uses encodeCors', () => {
    expect(defs.cors[adapterKey.set]('corsIn')).toBe('encodeCors')
    expect(encodeCors).toBeCalledWith('corsIn')
  })
  it('username setAdapter forces lower case', () => {
    expect(defs.username[adapterKey.set]('AlTCAse')).toBe('altcase')
  })
  it('password setAdapter uses encodePassword', async () => {
    let data = {}
    encodePassword.mockResolvedValueOnce({ pwkey: 'pwKey', salt: 'pwSalt' })
    await defs.password[adapterKey.set]('passwordIn', data)
    expect(encodePassword).toBeCalledWith('passwordIn')
    expect(data).toEqual({ pwkey: 'pwKey', salt: 'pwSalt' })
  })
  describe('models setAdapter', () => {
    it('calls modelAccessToInts', () => {
      defs.models[adapterKey.set]('modelsIn')
      expect(modelAccessToInts).toBeCalledWith('modelsIn')
    })
    it('stringifies result', () => {
      modelAccessToInts.mockReturnValueOnce({ a: 1, b: 2 })
      expect(defs.models[adapterKey.set]('modelsIn')).toBe('{"a":1,"b":2}')
    })
    it('defaults to empty object', () => {
      modelAccessToInts.mockReturnValueOnce(null)
      expect(defs.models[adapterKey.set]('modelsIn')).toBe('{}')
    })
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
    expect(guiAdapter(testObj)).toHaveProperty('cors', 'displayCors')
    expect(displayCors).toBeCalledWith('CORS')
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
  accessInt: jest.fn(() => 'accessInt'),
  decodeCors: jest.fn(() => 'decodeCors'),
  encodeCors: jest.fn(() => 'encodeCors'),
  displayCors: jest.fn(() => 'displayCors'),
  isRegEx: (cors) => 'isRegEx:'+cors,
  hasAccess: () => false,
  getModelsString: (models) => 'getModelsString:'+models,
  modelsArrayToObj: (models) => 'modelsArrayToObj:'+models,
  modelAccessToInts: jest.fn(() => 'modelAccessToInts'),
}))
jest.mock('../../utils/auth.utils', () => ({
  generateToken: () => 'generateToken',
  encodePassword: jest.fn()
}))
jest.mock('../../config/users.cfg', () => ({
  access: {},
  searchableKeys: ['searchA','searchB'],
}))