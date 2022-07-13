const { generateToken, encodePassword, testPassword } = require('../../utils/auth.utils')

describe('generateToken', () => {
  const hexChars = /^[0-9A-Fa-f]+$/

  it('creates string', () => {
    expect(typeof generateToken()).toBe('string')
  })
  it('token is 32 chars', () => {
    expect(generateToken()).toHaveLength(32)
  })
  it('token is hex chars only', () => {
    expect(generateToken()).toMatch(hexChars)
  })
})

describe('encodePassword', () => {
  const keyLen = require('../../config/users.cfg').encode.keylen
  const b64urlChars = /^[0-9A-Za-z_=.-]+$/
  const b64Len = (byteLen) => Math.ceil(byteLen * 4 / 3)

  it('creates salt & key', () => {
    expect(encodePassword('test')).toEqual({
      key: expect.any(String),
      salt: expect.any(String),
    })
  })
  it('salt & key are correct lengths', () => {
    const { salt, key } = encodePassword('test')
    expect(salt).toHaveLength(b64Len(32))
    expect(key).toHaveLength(b64Len(keyLen))
  })
  it('salt & key are in base64url', () => {
    const { salt, key } = encodePassword('test')
    expect(salt).toMatch(b64urlChars)
    expect(key).toMatch(b64urlChars)
  })
})

describe('testPassword', () => {
  const failureMsg = require('../../config/errors.internal').loginMessages
  const { salt, key } = encodePassword('test')
  let userData
  beforeEach(() => { userData = { salt, key, access: 1 } })

  it('succeeds on correct password', () => {
    expect(testPassword('test',1)(userData)).toBe(userData)
  })
  it('fails on incorrect password', () => {
    expect(testPassword('TEST',1)(userData)).toBe(failureMsg.noMatch)
    expect(testPassword('Anything',1)(userData)).toBe(failureMsg.noMatch)
    expect(testPassword('',1)(userData)).toBe(failureMsg.noMatch)
  })
  it('fails on no user', () => {
    expect(testPassword('test',1)({})).toBe(failureMsg.noUser)
    expect(testPassword('Anything',1)({})).toBe(failureMsg.noUser)
    expect(testPassword('test',1)()).toBe(failureMsg.noUser)
    expect(testPassword('Anything',1)()).toBe(failureMsg.noUser)
  })
  it('fails on no password', () => {
    userData.key = ''
    expect(testPassword('test',1)(userData)).toBe(failureMsg.noPassword)
    expect(testPassword('Anything',1)(userData)).toBe(failureMsg.noPassword)
  })
  it('fails on no access', () => {
    expect(testPassword('test',2)(userData)).toBe(failureMsg.noAccess)
    expect(testPassword('Anything',2)(userData)).toBe(failureMsg.noAccess)
    userData.access = 0
    expect(testPassword('test',1)(userData)).toBe(failureMsg.noAccess)
    expect(testPassword('Anything',1)(userData)).toBe(failureMsg.noAccess)
  })

  it('fail messages are all non-empty strings', () => {
    Object.values(failureMsg).forEach((msg) => {
      expect(msg).toHaveProperty('fail', expect.any(String))
      expect(msg.fail.length).toBeGreaterThan(0)
    })
  })

})