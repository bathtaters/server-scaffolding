const server = require('../../server')
const request = require('supertest-session')(server)

const Users = require('../../models/Users')
const { createUser } = require('../endpoint.utils')

const userPrefix = '/admin/users'

describe('Test Users Form Post', () => {
  let userInfo
  beforeAll(() => {
    const creds = { username: 'test', password: 'password', access: ['admin'] }
    return createUser(creds).then(() => request.post('/login').send(creds))
  })

  test('User login works', async () => {
    await request.get('/login').expect(302).expect('Location','/admin/settings')
  })

  test('POST /form Add', async () => {
    await request.post(`${userPrefix}/form/add`).expect(302).expect('Location',userPrefix)
      .send({ username: "apiuser", access: ["api"] })
    userInfo = await Users.get("apiuser", 'username')
    expect(userInfo).toBeTruthy()
    expect(userInfo.username).toBe("apiuser")
    expect(userInfo.access).toBe(1)
  })

  test('POST /form Update', async () => {
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, username: "newuser" })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.username).toBe("newuser")
  })

  test('GUI/Admin access w/o password', async () => {
    await request.post(`${userPrefix}/form/update`).expect(400)
      .send({ id: userInfo.id, access: ['admin'] })
    await request.post(`${userPrefix}/form/update`).expect(400)
      .send({ id: userInfo.id, access: ['gui','api'] })
  })

  test('Password requires confirm', async () => {
    await request.post(`${userPrefix}/form/update`).expect(400)
      .send({ id: userInfo.id, password: "password123" })
    
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({
        id: userInfo.id,
        password: "password123",
        confirm: "password123",
      })

      const user = await Users.checkPassword("newuser", "password123")
      expect(user.id).toBe(userInfo.id)
  })

  test('GUI/Admin access w/ password', async () => {
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, access: ['admin'] })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.access).toBe(4)

    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, access: ['gui','api'] })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.access).toBe(3)
  })

  test('Set CORS array', async () => {
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, cors: "a,b,c" })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.cors).toStrictEqual(["a","b","c"])
  })

  test('Set CORS RegEx', async () => {
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, cors: 'RegExp("abc")' })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.cors).toHaveProperty('source','abc')
  })
  
  test('Update Model Access', async () => {
    expect(userInfo.models).toEqual({ default: 3 })
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, models: ['default-none'] })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.models).toEqual({ default: 0 })
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, models: ['default-read','default-write'] })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.models).toEqual({ default: 3 })
  })

  test('POST /regenToken', async () => {
    const res = await request.post(`${userPrefix}/regenToken`).expect(200).expect('Content-Type', /json/)
      .send({ id: userInfo.id })
    expect(res.body).toEqual({ success: true })
    
    const oldToken = userInfo.token
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.token).not.toBe(oldToken)
  })

  test('POST /form Remove', async () => {
    await request.post(`${userPrefix}/form/remove`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo).toBeFalsy()
  })

  test('POST /form Reset', async () => {
    await request.post(`${userPrefix}/form/reset`).expect(302).expect('Location',userPrefix)
    userInfo = await Users.get()
    expect(userInfo).toEqual([])
  })

})