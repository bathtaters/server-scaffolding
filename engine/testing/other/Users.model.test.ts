import type { DBSchemaOf, SchemaOf } from '../../types/Model.d'
import type { TimestampType, UserDef } from '../../types/Users.d'
import { Role } from '../../types/Users'
import Users from '../../models/Users'
import { rateLimiter } from '../../config/users.cfg'
import * as errors from '../../config/errors.engine'
import { createAdmin } from '../endpoint.utils'

// *** NOTE: Uses unmocked USER & AUTH utils *** \\


describe('test Users model', () => {
  const uname = 'test', pword = 'password'
  beforeAll(async () => { await Users.isInitialized })

  test.todo('model initialization')
  // TODO -- Test all new additions to User model

  describe('test auto create admin', () => {
    beforeAll(async () => {
      await Users.create(true)
    })

    it('If 0 users, add user', async () => {
      expect(await Users.count()).toBe(0)
      const res = await Users.checkPassword(uname, pword, new Role('gui'))
      expect(res).toEqual(expect.objectContaining({ username: uname, id: expect.any(String) }))
      expect(await Users.count()).toBe(1)
    })
  })

  describe('checkPassword', () => {
    let userId: ID
    beforeAll(async () => {
      await Users.create(true)
      await createAdmin()
      userId = await Users.addAndReturn([{ username: uname, password: pword }])
        .then(({ id }) => id)
    })

    it('works', async () => {
      expect(await Users.update(userId, { role: new Role('gui') })).toEqual({ changed: 1 })

      expect(await Users.checkPassword(uname, pword,   new Role('gui'))).toEqual(expect.objectContaining({ id: userId }))
      expect(await Users.checkPassword(uname, 'wrong', new Role('gui'))).toEqual({ fail: expect.any(String) })
    })

    it('tests accessLevel', async () => {
      expect(await Users.update(userId, { role: new Role('gui') })).toEqual({ changed: 1 })

      expect(await Users.checkPassword(uname, pword, new Role('gui'))).toEqual(expect.objectContaining({ id: userId }))
      expect(await Users.checkPassword(uname, pword, new Role('api'))).toEqual({ fail: expect.any(String) })
    })

    it('tests lock status', async () => {
      expect(await Users.update(userId, { role: new Role('gui'), locked: true })).toEqual({ changed: 1 })
      expect(await Users.checkPassword(uname, pword, new Role('gui'))).toEqual({ fail: expect.any(String) })
      
      expect(await Users.update(userId, { locked: false })).toEqual({ changed: 1 })
      expect(await Users.checkPassword(uname, pword, new Role('gui'))).toEqual(expect.objectContaining({ id: userId }))
    })

    it('calls incFailCount on fail', async () => {
      const incFailSpy = jest.spyOn(Users, 'incFailCount')
      expect(await Users.checkPassword(uname, 'wrong', new Role('gui'))).toHaveProperty('fail')
      expect(incFailSpy).toBeCalledTimes(1)
      expect(incFailSpy).toBeCalledWith(
        expect.objectContaining({ id: userId   }),
        expect.objectContaining({ reset: false }),
      )
    })

    it('calls incFailCount on success', async () => {
      const incFailSpy = jest.spyOn(Users, 'incFailCount')
      expect(await Users.checkPassword(uname, pword, new Role('gui'))).toHaveProperty('id', userId)
      expect(incFailSpy).toBeCalledTimes(1)
      expect(incFailSpy).toBeCalledWith(
        expect.objectContaining({ id: userId  }),
        expect.objectContaining({ reset: true }),
      )
    })
  })

  describe('checkToken', () => {
    let userId: ID, userToken: Token
    
    beforeAll(async () => {
      await Users.create(true)
      await createAdmin()
      const { id, token } = await Users.addAndReturn([{ username: uname, password: pword, role: new Role('api') }])
      userId = id, userToken = token
    })

    it('works', async () => {
      expect(await Users.checkToken(userToken, new Role('api'))).toEqual(expect.objectContaining({ id: userId }))
      expect(await Users.checkToken('wrong',   new Role('api'))).toBe('NO_USER')
    })
    it('tests accessLevel', async () => {
      expect(await Users.checkToken(userToken, new Role('api'))).toEqual(expect.objectContaining({ id: userId }))
      expect(await Users.checkToken(userToken, new Role('gui'))).toBe('NO_ACCESS')
    })
    it('tests lock status', async () => {
      expect(await Users.update(userId, { locked: true })).toEqual({ changed: 1 })
      expect(await Users.checkToken(userToken, new Role('api'))).toBe('USER_LOCKED')
      expect(await Users.update(userId, { locked: false })).toEqual({ changed: 1 })
      expect(await Users.checkToken(userToken, new Role('api'))).toEqual(expect.objectContaining({ id: userId }))
    })
    it('updates apiTimestamp/Count', async () => {
      const getSpy = jest.spyOn(Users as any, '_getRaw')
      expect(await Users.checkToken(userToken, new Role('api'))).toEqual(expect.objectContaining({ id: userId }))

      expect(getSpy).toBeCalledTimes(1)
      expect(getSpy).toBeCalledWith(expect.anything(), expect.objectContaining({ timestamp: 'api' }))
    })
  })


  describe('areLastAdmins', () => {
    const areLastAdmins = jest.spyOn(Users, 'areLastAdmins')
    let userId: NonNullable<ID>
    
    beforeAll(async () => {
      await Users.create(true)
      userId = await Users.addAndReturn([{ username: uname, password: pword, role: new Role('admin') }])
        .then(({id}) => id as NonNullable<ID>)
      if (!userId) throw Error('Unable to add User for areLastAdmins tests')
    })
    afterAll(() => { areLastAdmins.mockResolvedValueOnce(false) /* force-remove mocks */ })

    it('user is only admin', async () => {
      expect(await Users.areLastAdmins({ id: userId })).toBe(true)
    })
    it('allows checking via username', async () => {
      expect(await Users.areLastAdmins({ username: uname })).toBe(true)
    })
    it('user is not only admin', async () => {
      const { id } = await Users.addAndReturn([{ username: 'other', password: pword, role: new Role('admin') }])
      expect(await Users.areLastAdmins({ id: userId })).toBe(false)
      
      areLastAdmins.mockResolvedValueOnce(false)
      await Users.remove(id)
    })
    it('user is not admin', async () => {
      areLastAdmins.mockResolvedValueOnce(false)
      await Users.update(userId, { role: new Role('api') })
      expect(areLastAdmins).toBeCalledTimes(1)
      
      expect(await Users.areLastAdmins({ id: userId })).toBe(false)
    })
  })


  describe('isInvalidUsername', () => {
    const validSpy = jest.spyOn(Users, 'isInvalidUsername')
    let userId: ID

    beforeAll(async () => {
      await Users.create(true)
      await createAdmin()
    })

    it('Add & Update username use it', async () => {
      expect(validSpy).toBeCalledTimes(0)
      userId = await Users.addAndReturn([{ username: 'original', password: 'origpass' }]).then(({id}) => id)
      expect(validSpy).toBeCalledTimes(1)
      await Users.update(userId, { username: uname })
      expect(validSpy).toBeCalledTimes(2)
      await Users.update(userId, { password: pword })
      expect(validSpy).toBeCalledTimes(2)
    })

    it('Disallows spaces/symbols', async () => {
      expect(await Users.isInvalidUsername('test123')).toBeFalsy()
      expect(await Users.isInvalidUsername('test 123')).toEqual(expect.any(String))
      expect(await Users.isInvalidUsername('test$!')).toEqual(expect.any(String))
    })
    it('Disallows existing username', async () => {
      expect(await Users.isInvalidUsername(uname + '123')).toBeFalsy()
      expect(await Users.isInvalidUsername(uname)).toEqual(expect.any(String))
      expect(await Users.isInvalidUsername(uname.toUpperCase())).toEqual(expect.any(String))
    })
  })


  describe('tokenRegen', () => {
    let userId: ID
    beforeAll(async () => {
      await Users.create(true)
      await createAdmin()
      userId = await Users.addAndReturn([{ username: uname, password: pword }]).then(({id}) => id)
    })

    it('Regenerates token', async () => {
      const oldToken = await Users.get(userId).then(({ token }) => token)
      expect(await Users.get(userId).then(({ token }) => token)).toBe(oldToken)
      expect(await Users.tokenRegen(userId)).toEqual({ changed: 1 })
      expect(await Users.get(userId).then(({ token }) => token)).not.toBe(oldToken)
    })
  })


  describe('incFailCount', () => {
    const failResetTime = () => new Date(new Date().getTime() - rateLimiter.failWindow - 10)

    let userId: ID, userData: DBSchemaOf<UserDef>
    
    beforeAll(async () => {
      await Users.create(true)
      await createAdmin()
    })

    beforeEach(async () => {
      if (userId) await Users.remove(userId).then(() => { userId = undefined })

      userData = await Users.addAndReturn([{ username: uname, password: pword, failCount: 0, locked: false }])
      userId = userData.id
    })

    it('uses injected userObj if provided', async () => {
      const getSpy = jest.spyOn(Users as any, '_getRaw')
      const testStart = new Date().getTime()
      expect(getSpy).toBeCalledTimes(0)

      expect(await Users.incFailCount(userData)).toEqual({ changed: 1 })
      expect(getSpy).toBeCalledTimes(0)
      userData = await Users.get(userId, { raw: true })
      expect(userData).toHaveProperty('failCount', 1)
      expect(new Date(userData.failTime ?? testStart - 1).getTime()).toBeGreaterThanOrEqual(testStart)
    })

    it('looks up user if idKey provided', async () => {
      const getSpy = jest.spyOn(Users as any, '_getRaw')
      const testStart = new Date().getTime()
      expect(getSpy).toBeCalledTimes(0)

      expect(await Users.incFailCount({ id: userId }, { idKey: 'id' })).toEqual({ changed: 1 })
      expect(getSpy).toBeCalledTimes(1)
      userData = await Users.get(userId, { raw: true })
      expect(userData).toHaveProperty('failCount', 1)
      expect(new Date(userData.failTime ?? testStart - 1).getTime()).toBeGreaterThanOrEqual(testStart)
    })

    it('resets counter/time/lock if reset=true', async () => {
      expect(await Users.update(userId, { locked: true })).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })
      expect(userData).toHaveProperty('failCount', 10)
      expect(userData).toHaveProperty('failTime', expect.any(Number))
      expect(userData).toHaveProperty('locked', +true)

      expect(await Users.incFailCount(userData, { reset: true })).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })
      expect(userData).toHaveProperty('failCount', 0)
      expect(userData).toHaveProperty('failTime', null)
      expect(userData).toHaveProperty('locked', +false)
    })

    it('locks if count >= max', async () => {
      expect(await Users.update(userId, { failTime: new Date(), failCount: 9 })).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })

      expect(await Users.incFailCount(userData)).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })
      expect(userData).toHaveProperty('failCount', 10)
      expect(userData).toHaveProperty('locked', +true)
    })

    it('resets then adds 1 if past window', async () => {
      expect(await Users.incFailCount(userData)).toEqual({ changed: 1 })
      expect(await Users.update(userId, { failTime: failResetTime(), failCount: 5 })).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })

      expect(await Users.incFailCount(userData)).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })
      expect(userData).toHaveProperty('failCount', 1)
    })

    it('autoUnlocks if enabled & past window', async () => {
      rateLimiter.autoUnlock = true
      expect(await Users.update(userId, { failTime: failResetTime(), locked: true })).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })

      expect(await Users.incFailCount(userData)).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })
      expect(userData).toHaveProperty('locked', +false)
      expect(userData).toHaveProperty('failCount', 1)
    })

    it('remains locked autoUnlock=false', async () => {
      rateLimiter.autoUnlock = false
      expect(await Users.update(userId, { failTime: failResetTime(), locked: true })).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })

      expect(await Users.incFailCount(userData)).toEqual({ changed: 1 })
      userData = await Users.get(userId, { raw: true })
      expect(userData.failCount).toBeGreaterThanOrEqual(10)
      expect(userData).toHaveProperty('locked', +true)
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

    /** Get timestamp from User database */
    const getUserTime = (id: ID, timePrefix: TimestampType) =>
      Users.get(id).then((data) => data[`${timePrefix}Time`]?.getTime())

    let userId: ID, extraId: ID

    beforeAll(async () => {
      await Users.create(true)
      userId = await Users.addAndReturn([{ username: uname, role: new Role('none') }])
        .then(({id}) => id)
    })

    it('Adds timestamps on get', async () => {
      const startTime = new Date().getTime()
      expect(await getUserTime(userId, 'api')).toBeFalsy()
      expect(await getUserTime(userId, 'gui')).toBeFalsy()

      await Users.get(userId, { timestamp: 'api' })
      expect(await getUserTime(userId, 'gui')).toBeFalsy()
      const aTime = await getUserTime(userId, 'api')
      expect(aTime).toBeGreaterThanOrEqual(startTime)
      expect(aTime).toBeLessThanOrEqual(new Date().getTime())

      await Users.get(userId, { timestamp: 'gui' })
      const gTime = await getUserTime(userId, 'gui')
      expect(gTime).toBeGreaterThanOrEqual(startTime)
      expect(gTime).toBeLessThanOrEqual(new Date().getTime())
    })

    it('Adds to visit counter', async () => {
      const aStart = await Users.get(userId).then(({ apiCount }) => apiCount ?? 0)
      const gStart = await Users.get(userId).then(({ guiCount }) => guiCount ?? 0)

      await Users.get(userId, { timestamp: 'api', ignoreCounter: false })
      expect(await Users.get(userId).then(({ apiCount }) => apiCount)).toEqual(aStart + 1)
      expect(await Users.get(userId).then(({ guiCount }) => guiCount)).toEqual(gStart)

      await Users.get(userId, { timestamp: 'gui', ignoreCounter: false })
      expect(await Users.get(userId).then(({ apiCount }) => apiCount)).toBe(aStart + 1)
      expect(await Users.get(userId).then(({ guiCount }) => guiCount)).toBe(gStart + 1)
    })

    it('Skips add to visit counter', async () => {
      const aStart = await Users.get(userId).then(({ apiCount }) => apiCount)
      const gStart = await Users.get(userId).then(({ guiCount }) => guiCount)

      await Users.get(userId, { timestamp: 'api', ignoreCounter: true })
      expect(await Users.get(userId).then(({ apiCount }) => apiCount)).toBe(aStart)
      expect(await Users.get(userId).then(({ guiCount }) => guiCount)).toBe(gStart)

      await Users.get(userId, { timestamp: 'gui', ignoreCounter: true })
      expect(await Users.get(userId).then(({ apiCount }) => apiCount)).toBe(aStart)
      expect(await Users.get(userId).then(({ guiCount }) => guiCount)).toBe(gStart)
    })

    it('Updating lock sets failTime/failCount', async () => {
      expect(await Users.get(userId)).toMatchObject({
        locked: false,
        failTime: null,
        failCount: 0,
      })
      expect(await Users.update(userId, { locked: true })).toEqual({ changed: 1 })
      expect(await Users.get(userId)).toMatchObject({
        locked: true,
        failTime: expect.any(Date),
        failCount: rateLimiter.maxFails,
      })
      expect(await Users.update(userId, { locked: false })).toEqual({ changed: 1 })
      expect(await Users.get(userId)).toMatchObject({
        locked: false,
        failTime: null,
        failCount: 0,
      })
    })

    it('Cannot enable GUI/admin access w/ no password', async () => {
      await expect(Users.update(userId, { role: new Role('admin') })).rejects.toThrowError()
      await expect(Users.update(userId, { role: new Role('gui') })).rejects.toThrowError()
      await expect(Users.update(userId, { password: 'password', role: new Role('gui') })).resolves.toEqual({ changed: 1 })
      await expect(Users.update(userId, { role: new Role('admin') })).resolves.toEqual({ changed: 1 })
    })

    it('Cannot remove only admin account', async () => {
      extraId = await Users.addAndReturn([{ username: 'extra', password: '123', role: new Role('gui') }])
        .then(({id}) => id)
      expect(await Users.update(userId, { role: new Role('admin') })).toEqual({ changed: 1 })

      await expect(Users.update(userId,  { role: new Role('gui')   })).rejects.toThrowError()
      expect(await Users.update(extraId, { role: new Role('admin') })).toEqual({ changed: 1 })
      expect(await Users.update(userId,  { role: new Role('gui')   })).toEqual({ changed: 1 })
    })

    it('Cannot remove access from only admin account', async () => {
      expect(await Users.update(userId,  { role: new Role('gui')   })).toEqual({ changed: 1 })
      expect(await Users.update(extraId, { role: new Role('admin') })).toEqual({ changed: 1 })

      await expect(Users.remove(extraId)).rejects.toThrowError()
      expect(await Users.update(userId, { role: new Role('admin') })).toEqual({ changed: 1 })
      expect(await Users.remove(extraId)).toEqual({ changed: 1 })
    })
  })
})


// MOCKS

jest.mock('../../config/users.cfg', () => ({
  ...jest.requireActual('../../config/users.cfg'),
  rateLimiter: { autoUnlock: false, maxFails: 10, failWindow: 1000 },
}))


// TYPES

type ID = SchemaOf<UserDef>['id']
type Token = SchemaOf<UserDef>['token']