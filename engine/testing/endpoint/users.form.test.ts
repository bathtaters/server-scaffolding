import server from '../../server'
import supertest from 'supertest'
import Users from '../../models/Users'
import { Role } from '../../types/Users'
import { type UserInfo, createUser, access } from '../endpoint.utils'
const request = supertest.agent(server)

const userPrefix = '/admin/users'

describe('Test Users Form Post', () => {
  let userInfo: UserInfo
  beforeAll(async () => {
    const creds = { username: 'test', password: 'password', role: new Role('admin') }
    await createUser(creds).then(() => request.post('/login').send(creds))
  })

  test('User login works', async () => {
    await request.get('/login').expect(302).expect('Location','/admin/settings')
  })

  test('POST /form Add', async () => {
    await request.post(`${userPrefix}/form/add`).expect(302).expect('Location',userPrefix)
      .send({ username: "apiuser", role: ["api"] })

    userInfo = await Users.get("apiuser", { idKey: 'username' })
    expect(userInfo).toBeTruthy()
    expect(userInfo.username).toBe("apiuser")
    expect(userInfo.role?.value).toBe(new Role('api').value)
  })

  test('POST /form Update', async () => {
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, username: "newuser" })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.username).toBe("newuser")
  })

  test('GUI/Admin role w/o password', async () => {
    await request.post(`${userPrefix}/form/update`).expect(400)
      .send({ id: userInfo.id, role: ['admin'] })
    await request.post(`${userPrefix}/form/update`).expect(400)
      .send({ id: userInfo.id, role: ['gui','api'] })
  })

  test('Password requires confirm', async () => {
    await request.post(`${userPrefix}/form/update`).expect(400)
      .send({ id: userInfo.id, password: "password123" })
    
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, password: "password123", confirm: "password123" })
      
      const user = await Users.checkPassword("newuser", "password123", userInfo.role ?? new Role('api'))
      expect('fail' in user && user.fail).toBe(false)
      expect('id' in user && user.id).toBe(userInfo.id)
  })

  test('GUI/Admin role w/ password', async () => {
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, role: ['admin'] })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.role?.value).toBe(new Role('admin').value)

    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, role: ['gui','api'] })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.role?.value).toBe(new Role('gui','api').value)
  })

  test('Set CORS array', async () => {
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, cors: "a,b,c" })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.cors?.type).toBe('array')
    expect(userInfo.cors?.value).toStrictEqual(["a","b","c"])
  })

  test('Set CORS RegEx', async () => {
    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, cors: 'RegExp("abc")' })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.cors?.type).toBe('regex')
    expect(userInfo.cors?.value).toHaveProperty('source','abc')
  })
  
  test('Update Model Access', async () => {
    expect(userInfo.access?.toJSON()).toBe(access('rw').toJSON())

    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, access: ['default-none'] })  
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.access?.toJSON()).toBe(access('none').toJSON())

    await request.post(`${userPrefix}/form/update`).expect(302).expect('Location',userPrefix)
      .send({ id: userInfo.id, access: ['default-read','default-write'] })
    userInfo = await Users.get(userInfo.id)
    expect(userInfo.access?.toJSON()).toBe(access('rw').toJSON())
  })

  test('POST /tokenRegen', async () => {
    const res = await request.post(`${userPrefix}/tokenRegen`).expect(200).expect('Content-Type', /json/)
      .send({ id: userInfo.id })
    expect(res.body).toEqual({ changed: 1 })
    
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
    const users = await Users.find()
    expect(users).toEqual([])
  })

})