const {
  getAdapter, setAdapter, addAdapter, guiAdapter,
  preValidateAdapter, adminFormAdapter, userFormAdapter
} = require('../../services/users.services')
const errors = require('../../config/errors.internal')

jest.mock('../../utils/users.utils', () => ({
  accessArray: (access) => ['accessArray', access],
  accessInt: (access) => 'accessInt:'+access,
  decodeCors: (cors) => 'decodeCors:'+cors,
  encodeCors: (cors) => 'encodeCors:'+cors,
  displayCors: (cors) => 'displayCors:'+cors,
  isRegEx: (cors) => 'isRegEx:'+cors,
  hasAccess: () => false,
  getModelsString: (models) => 'getModelsString:'+models,
  modelsArrayToObj: (models) => 'modelsArrayToObj:'+models,
}))
jest.mock('../../utils/auth.utils', () => ({
  generateToken: () => 'generateToken',
  encodePassword: (password) => ({ key: 'encodePassword:'+password, salt: 'encodeSalt' })
}))
jest.mock('../../config/users.cfg', () => ({
  access: {},
  definitions: { defaults: {
    username: 'usernameDefault',
    access: 'accessDefault',
    models: 'modelsDefault',
    cors: 'corsDefault',
  }}
}))

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
})

describe('User setAdapter', () => {
  beforeEach(() => { testObj = {
    models: { a: 1, b: 2, c: 3 },
    access: 'ACCESS',
    cors: 'CORS',
    username: 'UNAME',
    password: 'PASSWORD',
  } })

  it('strinigifys models', () => {
    expect(setAdapter(testObj)).toHaveProperty('models','{"a":1,"b":2,"c":3}')
  })
  it('encodes access', () => {
    expect(setAdapter(testObj)).toHaveProperty('access','accessInt:ACCESS')
  })
  it('encodes cors', () => {
    expect(setAdapter(testObj)).toHaveProperty('cors','encodeCors:CORS')
  })
  it('normalizes username', () => {
    expect(setAdapter(testObj)).toHaveProperty('username','uname')
  })
  it('encodes password', () => {
    const result = setAdapter(testObj)
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
  const localeDateString = /^\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} [AP]M$/
  beforeEach(() => { testObj = {
    models: 'MODELS',
    access: 'ACCESS',
    cors: 'CORS',
    guiTime: '2022-03-04T05:06:07',
    apiTime: '2021-02-13T14:25:36',
  } })

  it('decodes access', () => {
    expect(guiAdapter(testObj)).toHaveProperty('access', 'accessArray, ACCESS')
  })
  it('stringifys models', () => {
    expect(guiAdapter(testObj)).toHaveProperty('models', 'getModelsString:MODELS')
  })
  it('formats dates', () => {
    let result = guiAdapter(testObj)
    expect(result).toHaveProperty('guiTime', expect.stringMatching(localeDateString))
    expect(result).toHaveProperty('apiTime', expect.stringMatching(localeDateString))
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
      { access: 'accessArray, ACC' }, { models: 'getModelsString:MODS' }
    ])
  })
  it('null returns empty array', () => {
    expect(guiAdapter(null)).toEqual([])
    expect(guiAdapter()).toEqual([])
  })
})

describe('User pre-validateAdapter', () => {
  beforeEach(() => { testObj = {
    models: 'a,b,c',
    access: '1,2,3',
  } })

  it('search doesn\'t contain models', () => {
    expect(preValidateAdapter(testObj, true)).not.toHaveProperty('models')
  })
  it('convert models csv to array', () => {
    expect(preValidateAdapter(testObj)).toHaveProperty('models', ['a','b','c'])
  })
  it('convert access csv to array', () => {
    expect(preValidateAdapter(testObj)).toHaveProperty('access', ['1','2','3'])
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