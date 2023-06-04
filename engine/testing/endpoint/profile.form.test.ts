import server from '../../server'
import supertest from 'supertest'
import { type UserInfo, createUser } from '../endpoint.utils'
import Users from '../../models/Users'
import { Role } from '../../types/Users'
const request = supertest.agent(server)

const profilePrefix = '/gui/profile'
const creds = { username: 'test', password: 'password' }

describe('Test User Profile Form Post', () => {
  let userInfo: UserInfo
  beforeAll(async () => {
    // Create admin to avoid 'cannot delete only admin' error
    await createUser({ username: 'admin', password: 'password', role: new Role('admin') })
    await createUser({ ...creds, role: new Role('gui') }).then((info) => { userInfo = info })
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
    
    const isPassword = await Users.checkPassword(creds.username, creds.password, new Role('gui'))
    expect('fail' in isPassword && isPassword.fail).toBe(false)
    expect('id' in isPassword && isPassword.id).toBe(userInfo.id)
  })

  test('POST /tokenRegen', async () => {
    const res = await request.post(`${profilePrefix}/tokenRegen`).expect(200).expect('Content-Type', /json/)
      .send({ id: userInfo.id })
    expect(res.body).toEqual({ changed: 1 })
    
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