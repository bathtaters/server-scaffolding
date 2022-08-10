const server = require('../../server')
const request = require('supertest-session')(server)

const Users = require('../../models/Users')
const { createUser } = require('../endpoint.utils')

const profilePrefix = '/gui/profile'
const creds = { username: 'test', password: 'password' }

describe('Test User Profile Form Post', () => {
  let userInfo
  beforeAll(async () => {
    await createUser({ ...creds, access: ['gui'] }).then((info) => { userInfo = info })
    await request.post('/login').send(creds)
  })

  test('User login works', async () => {
    await request.get('/login').expect(302).expect('Location','/gui/db')
  })

  test('POST /form Update', async () => {
    creds.username = "newuser"
    await request.post(`${profilePrefix}/form/update`).expect(302).expect('Location',profilePrefix)
      .send({ id: userInfo.id, username: creds.username })

    userInfo = await Users.get(userInfo.id)
    expect(userInfo.username).toBe(userInfo.username)
  })

  test('Password requires confirm', async () => {
    creds.password = "password123"
    await request.post(`${profilePrefix}/form/update`).expect(400)
      .send({ id: userInfo.id, password: creds.password })
    
    await request.post(`${profilePrefix}/form/update`).expect(302).expect('Location',profilePrefix)
      .send({
        id: userInfo.id,
        password: creds.password,
        confirm: creds.password,
      })
    
    const isPassword = await Users.checkPassword(creds.username, creds.password)
    expect(isPassword.id).toBe(userInfo.id)
  })

  test('POST /regenToken', async () => {
    const res = await request.post(`${profilePrefix}/regenToken`).expect(200).expect('Content-Type', /json/)
      .send({ id: userInfo.id })
    expect(res.body).toEqual({ success: true })
    
    const oldToken = userInfo.token
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.token).not.toBe(oldToken)
  })

  test('POST /form Remove', async () => {
    await request.post(`${profilePrefix}/form/remove`).expect(302).expect('Location',profilePrefix)
      .send({ id: userInfo.id, })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo).toBeFalsy()
  })
})