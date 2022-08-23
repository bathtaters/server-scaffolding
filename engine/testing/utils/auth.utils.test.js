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

  it('creates salt & pwkey', async () => {
    expect(await encodePassword('test')).toEqual({
      pwkey: expect.any(String),
      salt: expect.any(String),
    })
  })
  it('salt & pwkey are correct lengths', async () => {
    const { salt, pwkey } = await encodePassword('test')
    expect(salt).toHaveLength(b64Len(32))
    expect(pwkey).toHaveLength(b64Len(keyLen))
  })
  it('salt & pwkey are in base64url', async () => {
    const { salt, pwkey } = await encodePassword('test')
    expect(salt).toMatch(b64urlChars)
    expect(pwkey).toMatch(b64urlChars)
  })
})

describe('testPassword', () => {
  const failureMsg = require('../../config/errors.engine').loginMessages
  let userData
  // Salt & Key for Password "test"
  const salt = "imjVpGPz3djhiHViFEdLFc5xYaq0QrdBCnTp5kYIc1k",
    pwkey = "hLLJYoCURZxkW0RBpEQwUKr-noqCNSz7vBBhJaVSzHMDdKXaB5QGpKRgIbaLlT0JlPTxFejCTgCNFHkB8nKjmA"

  beforeEach(() => { userData = { salt, pwkey, access: 1 } })

  it('succeeds on correct password', async () => {
    expect(await testPassword('test',1)(userData)).toBe(userData)
  })
  it('fails on incorrect password', async () => {
    expect(await testPassword('TEST',1)(userData)).toBe(failureMsg.noMatch)
    expect(await testPassword('Anything',1)(userData)).toBe(failureMsg.noMatch)
    expect(await testPassword('',1)(userData)).toBe(failureMsg.noMatch)
  })
  it('fails on no user', async () => {
    expect(await testPassword('test',1)({})).toBe(failureMsg.noUser)
    expect(await testPassword('Anything',1)({})).toBe(failureMsg.noUser)
    expect(await testPassword('test',1)()).toBe(failureMsg.noUser)
    expect(await testPassword('Anything',1)()).toBe(failureMsg.noUser)
  })
  it('fails on no password', async () => {
    userData.pwkey = ''
    expect(await testPassword('test',1)(userData)).toBe(failureMsg.noPassword)
    expect(await testPassword('Anything',1)(userData)).toBe(failureMsg.noPassword)
  })
  it('fails on no access', async () => {
    expect(await testPassword('test',2)(userData)).toBe(failureMsg.noAccess)
    expect(await testPassword('Anything',2)(userData)).toBe(failureMsg.noAccess)
    userData.access = 0
    expect(await testPassword('test',1)(userData)).toBe(failureMsg.noAccess)
    expect(await testPassword('Anything',1)(userData)).toBe(failureMsg.noAccess)
  })

  it('fail messages are all non-empty strings', () => {
    Object.values(failureMsg).forEach((msg) => {
      expect(msg).toHaveProperty('fail', expect.any(String))
      expect(msg.fail.length).toBeGreaterThan(0)
    })
  })

})