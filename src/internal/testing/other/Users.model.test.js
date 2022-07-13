const Users = require('../../models/Users')

const getUserTime = (id, timePrefix) => Users.get(id).then((data) => data[timePrefix+'Time'] && new Date(data[timePrefix+'Time']).getTime())

describe('test Users model', () => {
  const uname = 'test', pword = 'password'
  beforeAll(() => Users.isInitialized)

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
  })


  describe('checkToken', () => {
    let userId, userToken
    
    beforeAll(async () => {
      userId = await Users.add({ username: uname, password: pword, access: ['api'] })
      userToken = await Users.get(userId).then(({ token }) => token)
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
    it('updates apiTimestamp', async () => {
      const getSpy = jest.spyOn(Users, 'get')
      expect(await Users.checkToken(userToken, 'api')).toEqual(expect.objectContaining({ id: userId }))
      expect(getSpy).toBeCalledWith(expect.any(String), expect.any(String), 'api')
    })
  })


  describe('validUsername', () => {
    const validSpy = jest.spyOn(Users, 'validUsername')
    let userId
    afterAll(() => Users.remove(userId))

    it('Add & Update username use it', async () => {
      expect(validSpy).toBeCalledTimes(0)
      userId = await Users.add({ username: 'original' })
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
    beforeAll(async () => { userId = await Users.add({ username: uname }) })
    afterAll(() => Users.remove(userId))

    it('Regenerates token', async () => {
      const oldToken = await Users.get(userId).then(({ token }) => token)
      expect(await Users.get(userId).then(({ token }) => token)).toBe(oldToken)
      expect(await Users.regenToken(userId)).toEqual({ success: true })
      expect(await Users.get(userId).then(({ token }) => token)).not.toBe(oldToken)
    })
  })


  describe('extended CRUD', () => {
    let userId, extraId
    beforeAll(async () => { userId = await Users.add({ username: uname }) })
    afterAll(() => Users.create(true))

    it('Adds timestamps on get', async () => {
      const startTime = new Date().getTime()
      expect(await getUserTime(userId, 'api')).toBeFalsy()
      expect(await getUserTime(userId, 'gui')).toBeFalsy()

      await Users.get(userId, null, 'api')
      await Users.bgThread
      expect(await getUserTime(userId, 'gui')).toBeFalsy()
      const aTime = await getUserTime(userId, 'api')
      expect(aTime).toBeGreaterThanOrEqual(startTime)
      expect(aTime).toBeLessThanOrEqual(new Date().getTime())

      await Users.get(userId, null, 'gui')
      await Users.bgThread
      const gTime = await getUserTime(userId, 'gui')
      expect(gTime).toBeGreaterThanOrEqual(startTime)
      expect(gTime).toBeLessThanOrEqual(new Date().getTime())
    })

    it('Cannot enable GUI/admin access w/ no password', async () => {
      await expect(Users.update(userId, { access: ['admin'] })).rejects.toThrowError()
      await expect(Users.update(userId, { access: ['gui'] })).rejects.toThrowError()
      await expect(Users.update(userId, { password: 'password', access: ['gui'] })).resolves.toEqual({ success: true })
      await expect(Users.update(userId, { access: ['admin'] })).resolves.toEqual({ success: true })
    })

    it('Cannot remove only admin account', async () => {
      extraId = await Users.add({ username: 'extra', password: '123', access: ['gui'] })
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
