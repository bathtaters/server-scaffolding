const Users = require('../../models/Users')
const { rateLimiter, definitions } = require('../../config/users.cfg')
const { adapterKey } = require('../../config/models.cfg')
const errors = require('../../config/errors.engine')

// *** NOTE: Uses unmocked USER & AUTH utils *** \\

const getUserTime = (id, timePrefix) => Users.get(id).then((data) => data[timePrefix+'Time'] && new Date(data[timePrefix+'Time']).getTime())

describe('test Users model', () => {
  const uname = 'test', pword = 'password'
  beforeAll(() => Users.isInitialized)

  describe('model initialization', () => {
    it('Uses definitions from users.cfg', () => {
      expect(Users.schema).toBe(definitions)
    })
    it('Sets up adapters', () => {
      expect(Users.schema.password).toHaveProperty(adapterKey.set, expect.any(Function))
    })
    it('Collects validTimestamps from schema', () => {
      expect(Users.validTimestamps.sort()).toEqual(['gui','api','fail'].sort())
    })
  })

  describe('checkPassword', () => {
    let userId
    afterAll(() => Users.remove(userId))

    it('If 0 users, add user', async () => {
      expect(await Users.count()).toBe(0)
      const res = await Users.checkPassword(uname, pword)
      expect(res).toEqual(expect.objectContaining({ username: uname, id: expect.any(String) }))
      expect(await Users.count()).toBe(1)
      userId = res.id
    })

    it('works', async () => {
      expect(await Users.checkPassword(uname, pword)).toEqual(expect.objectContaining({ id: userId }))
      expect(await Users.checkPassword(uname, 'wrong')).toEqual({ fail: expect.any(String) })
    })

    it('tests accessLevel', async () => {
      expect(await Users.update(userId, { access: ['gui'] })).toEqual({ success: true })

      expect(await Users.checkPassword(uname, pword, 'gui')).toEqual(expect.objectContaining({ id: userId }))
      expect(await Users.checkPassword(uname, pword, 'admin')).toEqual({ fail: expect.any(String) })
    })

    it('tests lock status', async () => {
      expect(await Users.update(userId, { access: ['gui'], locked: true })).toEqual({ success: true })
      expect(await Users.checkPassword(uname, pword, 'gui')).toEqual({ fail: expect.any(String) })
      
      expect(await Users.update(userId, { locked: false })).toEqual({ success: true })
      expect(await Users.checkPassword(uname, pword, 'gui')).toEqual(expect.objectContaining({ id: userId }))
    })

    it('calls incFailCount on fail', async () => {
      const incFailSpy = jest.spyOn(Users, 'incFailCount')
      expect(await Users.checkPassword(uname, 'wrong', 'gui')).toHaveProperty('fail')
      expect(incFailSpy).toBeCalledTimes(1)
      expect(incFailSpy).toBeCalledWith(
        expect.objectContaining({ id: userId }),
        expect.objectContaining({ reset: false })
      )
    })

    it('calls incFailCount on success', async () => {
      const incFailSpy = jest.spyOn(Users, 'incFailCount')
      expect(await Users.checkPassword(uname, pword, 'gui')).toHaveProperty('id', userId)
      expect(incFailSpy).toBeCalledTimes(1)
      expect(incFailSpy).toBeCalledWith(
        expect.objectContaining({ id: userId }),
        expect.objectContaining({ reset: true })
      )
    })
  })


  describe('checkToken', () => {
    let userId, userToken
    
    beforeAll(async () => {
      const { id, token } = await Users.add({ username: uname, password: pword, access: ['api'] })
      userId = id, userToken = token
    })
    afterAll(() => Users.remove(userId))

    it('works', async () => {
      expect(await Users.checkToken(userToken, 'api')).toEqual(expect.objectContaining({ id: userId }))
      expect(await Users.checkToken('wrong',   'api')).toBeFalsy()
    })
    it('tests accessLevel', async () => {
      expect(await Users.checkToken(userToken, 'api')).toEqual(expect.objectContaining({ id: userId }))
      expect(await Users.checkToken(userToken, 'gui')).toBeFalsy()
    })
    it('tests lock status', async () => {
      expect(await Users.update(userId, { locked: true })).toEqual({ success: true })
      expect(await Users.checkToken(userToken, 'api')).toBeFalsy()
      expect(await Users.update(userId, { locked: false })).toEqual({ success: true })
      expect(await Users.checkToken(userToken, 'api')).toEqual(expect.objectContaining({ id: userId }))
    })
    it('updates apiTimestamp', async () => {
      const getSpy = jest.spyOn(Users, 'get')
      expect(await Users.checkToken(userToken, 'api')).toEqual(expect.objectContaining({ id: userId }))
      expect(getSpy).toBeCalledWith(expect.any(String), expect.any(String), expect.any(Boolean), 'api')
    })
  })


  describe('isLastAdmin', () => {
    const isLastAdmin = jest.spyOn(Users, 'isLastAdmin')
    let userId
    
    beforeAll(async () => {
      userId = await Users.add({ username: uname, password: pword, access: ['admin'] }).then(({id}) => id)
    })
    afterAll(async () => {
      isLastAdmin.mockResolvedValueOnce(false) // force remove
      await Users.remove(userId)
    })

    it('user is only admin', async () => {
      expect(await Users.isLastAdmin(userId)).toBe(true)
    })
    it('allows checking via idKey', async () => {
      expect(await Users.isLastAdmin(uname, 'username')).toBe(true)
    })
    it('user is not only admin', async () => {
      const { id } = await Users.add({ username: 'other', password: pword, access: ['admin'] })
      expect(await Users.isLastAdmin(userId)).toBe(false)
      
      isLastAdmin.mockResolvedValueOnce(false)
      await Users.remove(id)
    })
    it('user is not admin', async () => {
      isLastAdmin.mockResolvedValueOnce(false)
      await Users.update(userId, { access: ['api'] })
      expect(isLastAdmin).toBeCalledTimes(1)
      
      expect(await Users.isLastAdmin(userId)).toBe(false)
    })
    it('error if idKey not in Schema', async () => {
      await expect(Users.isLastAdmin(uname, 'badKey')).rejects.toEqual(errors.badKey('badKey',Users.title))
    })
  })


  describe('validUsername', () => {
    const validSpy = jest.spyOn(Users, 'validUsername')
    let userId
    afterAll(() => Users.remove(userId))

    it('Add & Update username use it', async () => {
      expect(validSpy).toBeCalledTimes(0)
      userId = await Users.add({ username: 'original', password: 'origpass' }).then(({id}) => id)
      expect(validSpy).toBeCalledTimes(1)
      await Users.update(userId, { username: uname })
      expect(validSpy).toBeCalledTimes(2)
      await Users.update(userId, { password: pword })
      expect(validSpy).toBeCalledTimes(2)
    })

    it('Disallows spaces/symbols', async () => {
      expect(await Users.validUsername('test123')).toBeFalsy()
      expect(await Users.validUsername('test 123')).toEqual(expect.any(String))
      expect(await Users.validUsername('test$!')).toEqual(expect.any(String))
    })
    it('Disallows existing username', async () => {
      expect(await Users.validUsername(uname + '123')).toBeFalsy()
      expect(await Users.validUsername(uname)).toEqual(expect.any(String))
      expect(await Users.validUsername(uname.toUpperCase())).toEqual(expect.any(String))
    })
  })


  describe('regenToken', () => {
    let userId
    beforeAll(async () => { userId = await Users.add({ username: uname, password: pword }).then(({id}) => id) })
    afterAll(() => Users.remove(userId))

    it('Regenerates token', async () => {
      const oldToken = await Users.get(userId).then(({ token }) => token)
      expect(await Users.get(userId).then(({ token }) => token)).toBe(oldToken)
      expect(await Users.regenToken(userId)).toEqual({ success: true })
      expect(await Users.get(userId).then(({ token }) => token)).not.toBe(oldToken)
    })
  })


  describe('incFailCount', () => {
    let userId, userData
    
    beforeEach(async () => {
      if (userId) await Users.remove(userId)
      userData = await Users.add({ username: uname, password: pword, failCount: 0, locked: false })
      userId = userData.id
    })
    afterAll(() => Users.remove(userId))

    it('uses injected userObj if provided', async () => {
      const getSpy = jest.spyOn(Users, 'get')
      const testStart = new Date().getTime()
      expect(getSpy).toBeCalledTimes(0)

      expect(await Users.incFailCount(userData)).toEqual({ success: true })
      expect(getSpy).toBeCalledTimes(0)
      userData = await Users.get(userId)
      expect(userData).toHaveProperty('failCount', 1)
      expect(new Date(userData.failTime).getTime()).toBeGreaterThanOrEqual(testStart)
    })

    it('looks up user if idKey provided', async () => {
      const getSpy = jest.spyOn(Users, 'get')
      const testStart = new Date().getTime()
      expect(getSpy).toBeCalledTimes(0)

      expect(await Users.incFailCount({ id: userId }, { idKey: 'id' })).toEqual({ success: true })
      expect(getSpy).toBeCalledTimes(1)
      userData = await Users.get(userId)
      expect(userData).toHaveProperty('failCount', 1)
      expect(new Date(userData.failTime).getTime()).toBeGreaterThanOrEqual(testStart)
    })

    it('resets counter/time/lock if reset=true', async () => {
      expect(await Users.update(userId, { locked: true })).toEqual({ success: true })
      userData = await Users.get(userId)
      expect(userData).toHaveProperty('failCount', 10)
      expect(userData).toHaveProperty('failTime', expect.any(Date))
      expect(userData).toHaveProperty('locked', true)

      expect(await Users.incFailCount(userData, { reset: true })).toEqual({ success: true })
      userData = await Users.get(userId)
      expect(userData).toHaveProperty('failCount', 0)
      expect(userData).toHaveProperty('failTime', null)
      expect(userData).toHaveProperty('locked', false)
    })

    it('locks if count >= max', async () => {
      expect(await Users.update(userId, { failCount: 9 })).toEqual({ success: true })
      userData = await Users.get(userId)

      expect(await Users.incFailCount(userData)).toEqual({ success: true })
      userData = await Users.get(userId)
      expect(userData).toHaveProperty('failCount', 10)
      expect(userData).toHaveProperty('locked', true)
    })

    it('resets then adds 1 if past window', async () => {
      expect(await Users.incFailCount(userData)).toEqual({ success: true })
      expect(await Users.update(userId, { failCount: 5 })).toEqual({ success: true })
      await new Promise((res) => setTimeout(res, 1010))
      userData = await Users.get(userId)

      expect(await Users.incFailCount(userData)).toEqual({ success: true })
      userData = await Users.get(userId)
      expect(userData).toHaveProperty('failCount', 1)
    })

    it('autoUnlocks if enabled & past window', async () => {
      rateLimiter.autoUnlock = true
      expect(await Users.update(userId, { locked: true })).toEqual({ success: true })
      await new Promise((res) => setTimeout(res, 1010))
      userData = await Users.get(userId)

      expect(await Users.incFailCount(userData)).toEqual({ success: true })
      userData = await Users.get(userId)
      expect(userData).toHaveProperty('locked', false)
      expect(userData).toHaveProperty('failCount', 1)
    })

    it('remains locked autoUnlock=false', async () => {
      rateLimiter.autoUnlock = false
      expect(await Users.update(userId, { locked: true })).toEqual({ success: true })
      await new Promise((res) => setTimeout(res, 1010))
      userData = await Users.get(userId)

      expect(await Users.incFailCount(userData)).toEqual({ success: true })
      userData = await Users.get(userId)
      expect(userData.failCount).toBeGreaterThanOrEqual(10)
      expect(userData).toHaveProperty('locked', true)
    })

    it('calls updateCb and uses result', async () => {
      const updateCb = jest.fn(() => ({ failCount: 12 }))
      expect(await Users.incFailCount(userData, { updateCb })).toEqual({ success: true })

      userData = await Users.get(userId)
      expect(updateCb).toBeCalledTimes(1)
      expect(updateCb).toBeCalledWith(
        { failCount: 1, failTime: expect.any(Number), locked: false },
        expect.objectContaining({ id: userData.id })
      )
      expect(userData).toHaveProperty('failCount', 12)
    })

    it('uses original update if updateCb returns falsy', async () => {
      const updateCb = jest.fn()
      expect(await Users.incFailCount(userData, { updateCb })).toEqual({ success: true })

      userData = await Users.get(userId)
      expect(updateCb).toBeCalledTimes(1)
      expect(updateCb).toBeCalledWith(
        { failCount: 1, failTime: expect.any(Number), locked: 0 },
        expect.objectContaining({ id: userData.id })
      )
      expect(userData).toHaveProperty('failCount', 1)
    })

    it('throws on no user or id or user not found', async () => {
      expect.assertions(3)
      await expect(Users.incFailCount())
        .rejects.toEqual(errors.noID())
      await expect(Users.incFailCount({}, { idKey: 'id' }))
        .rejects.toEqual(errors.noID())
      await expect(Users.incFailCount({ id: 'fail' }, { idKey: 'id' }))
        .rejects.toEqual(errors.noEntry('fail'))
    })
  })


  describe('extended CRUD', () => {
    let userId, extraId
    beforeAll(async () => { userId = await Users.add({ username: uname, access: [] }).then(({id}) => id) })
    afterAll(() => Users.create(true))

    it('Adds timestamps on get', async () => {
      const startTime = new Date().getTime()
      expect(await getUserTime(userId, 'api')).toBeFalsy()
      expect(await getUserTime(userId, 'gui')).toBeFalsy()

      await Users.get(userId, null, false, 'api')
      expect(await getUserTime(userId, 'gui')).toBeFalsy()
      const aTime = await getUserTime(userId, 'api')
      expect(aTime).toBeGreaterThanOrEqual(startTime)
      expect(aTime).toBeLessThanOrEqual(new Date().getTime())

      await Users.get(userId, null, false, 'gui')
      const gTime = await getUserTime(userId, 'gui')
      expect(gTime).toBeGreaterThanOrEqual(startTime)
      expect(gTime).toBeLessThanOrEqual(new Date().getTime())
    })

    it('Adds to visit counter', async () => {
      const aStart = await Users.get(userId).then(({ apiCount }) => apiCount)
      const gStart = await Users.get(userId).then(({ guiCount }) => guiCount)

      await Users.get(userId, null, false, 'api', false)
      expect(await Users.get(userId).then(({ apiCount }) => apiCount)).toBe(aStart + 1)
      expect(await Users.get(userId).then(({ guiCount }) => guiCount)).toBe(gStart)

      await Users.get(userId, null, false, 'gui', false)
      expect(await Users.get(userId).then(({ apiCount }) => apiCount)).toBe(aStart + 1)
      expect(await Users.get(userId).then(({ guiCount }) => guiCount)).toBe(gStart + 1)
    })

    it('Skips add to visit counter', async () => {
      const aStart = await Users.get(userId).then(({ apiCount }) => apiCount)
      const gStart = await Users.get(userId).then(({ guiCount }) => guiCount)

      await Users.get(userId, null, false, 'api', true)
      expect(await Users.get(userId).then(({ apiCount }) => apiCount)).toBe(aStart)
      expect(await Users.get(userId).then(({ guiCount }) => guiCount)).toBe(gStart)

      await Users.get(userId, null, false, 'gui', true)
      expect(await Users.get(userId).then(({ apiCount }) => apiCount)).toBe(aStart)
      expect(await Users.get(userId).then(({ guiCount }) => guiCount)).toBe(gStart)
    })

    it('Updating lock sets failTime/failCount', async () => {
      expect(await Users.get(userId)).toMatchObject({
        locked: false,
        failTime: null,
        failCount: 0,
      })
      expect(await Users.update(userId, { locked: true })).toEqual({ success: true })
      expect(await Users.get(userId)).toMatchObject({
        locked: true,
        failTime: expect.any(Date),
        failCount: rateLimiter.maxFails,
      })
      expect(await Users.update(userId, { locked: false })).toEqual({ success: true })
      expect(await Users.get(userId)).toMatchObject({
        locked: false,
        failTime: null,
        failCount: 0,
      })
    })

    it('Cannot enable GUI/admin access w/ no password', async () => {
      await expect(Users.update(userId, { access: ['admin'] })).rejects.toThrowError()
      await expect(Users.update(userId, { access: ['gui'] })).rejects.toThrowError()
      await expect(Users.update(userId, { password: 'password', access: ['gui'] })).resolves.toEqual({ success: true })
      await expect(Users.update(userId, { access: ['admin'] })).resolves.toEqual({ success: true })
    })

    it('Cannot remove only admin account', async () => {
      extraId = await Users.add({ username: 'extra', password: '123', access: ['gui'] }).then(({id}) => id)
      expect(await Users.update(userId, { access: ['admin'] })).toEqual({ success: true })

      await expect(Users.update(userId,  { access: ['gui']   })).rejects.toThrowError()
      expect(await Users.update(extraId, { access: ['admin'] })).toEqual({ success: true })
      expect(await Users.update(userId,  { access: ['gui']   })).toEqual({ success: true })
    })

    it('Cannot remove access from only admin account', async () => {
      expect(await Users.update(userId,  { access: ['gui']   })).toEqual({ success: true })
      expect(await Users.update(extraId, { access: ['admin'] })).toEqual({ success: true })

      await expect(Users.remove(extraId)).rejects.toThrowError()
      expect(await Users.update(userId, { access: ['admin'] })).toEqual({ success: true })
      expect(await Users.remove(extraId)).toEqual({ success: true })
    })
  })
})


// MOCKS

jest.mock('../../config/users.cfg', () => ({
  ...jest.requireActual('../../config/users.cfg'),
  rateLimiter: { autoUnlock: false, maxFails: 10, failWindow: 1000 },
}))