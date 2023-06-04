import server from '../../server'
import supertest from 'supertest'
import { type UserInfo, createUser, updateUser, testModelData, access } from '../endpoint.utils'
import { Role } from '../../types/Users'
const request = supertest.agent(server)

const { Model, testKey, idKey, prefix } = testModelData
const url = { success: '/gui/db', fail: '/login', ...prefix }
const creds = { username: 'test', password: 'password' }


describe('Test User Authentication', () => {
  let userInfo: UserInfo
  beforeAll(async () => { userInfo = await createUser({ ...creds }) })


  describe('GUI Authentication', () => {
    test('Login fails while locked', async () => {
      await updateUser(userInfo, { role: new Role('api','gui'), locked: true })
      await request.post('/login').send(creds).expect(302).expect('Location', url.fail)
      await updateUser(userInfo, { locked: false })
      await request.post('/login').send(creds).expect(302).expect('Location', url.success)
    })
    test('API login fails', async () => {
      await updateUser(userInfo, { role: new Role('api') })
      await request.post('/login').send(creds).expect(302).expect('Location', url.fail)
    })
    test('GUI login works', async () => {
      await updateUser(userInfo, { role: new Role('gui') })
      await request.post('/login').send(creds).expect(302).expect('Location', url.success)
    })
  

    test('User GUI allows read', async () => {
      await updateUser(userInfo, { access: access('rw', Model.title) })
      await request.post(`${url.gui}/form/search`).expect(302).expect('Location', url.gui)
  
      await updateUser(userInfo, { access: access('read', Model.title) })
      await request.post(`${url.gui}/form/search`).expect(302).expect('Location', url.gui)
    })
    test('User GUI allows write', async () => {
      await updateUser(userInfo, { access: access('rw', Model.title) })
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N1" })
        .expect(302).expect('Location', url.gui)
  
      await updateUser(userInfo, { access: access('write', Model.title) })
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N2" })
        .expect(302).expect('Location', url.gui)
    })
    test('User GUI disallows writes', async () => {
      await updateUser(userInfo, { access: access('none', Model.title) })
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N3" }).expect(403)
  
      await updateUser(userInfo, { access: access('read', Model.title) })
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N4" }).expect(403)
    })
    test('User GUI disallows reads', async () => {
      await updateUser(userInfo, { access: access('none', Model.title) })
      await request.post(`${url.gui}/form/search`).expect(403)
  
      await updateUser(userInfo, { access: access('write', Model.title) })
      await request.post(`${url.gui}/form/search`).expect(403)
    })


    test('Missing model access falls back to default', async () => {
      await updateUser(userInfo, { access: access('read') })
      await request.post(`${url.gui}/form/add`).expect(403).send({ [testKey]: "N9" })
      await request.post(`${url.gui}/form/search`).expect(302).expect('Location', url.gui)
      
      await updateUser(userInfo, { access: access('write') })
      await request.post(`${url.gui}/form/search`).expect(403)
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N6" })
        .expect(302).expect('Location', url.gui)
    })
  })



  describe('API Authentication', () => {
    let header: Record<string,string>
    beforeAll(() => { header = { Authorization: `Bearer ${userInfo.token}` } })


    test('User request fails while locked', async () => {
      await updateUser(userInfo, { role: new Role('api','gui'), access: access('rw'), locked: true })
      await request.get(url.api).set(header).expect(403)
      await updateUser(userInfo, { locked: false })
      await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
    })
    test('GUI User request fails', async () => {
      await updateUser(userInfo, { role: new Role('gui'), access: access('rw') })
      await request.get(url.api).set(header).expect(403)
    })
    test('API User request works', async () => {
      await updateUser(userInfo, { role: new Role('api'), access: access('rw') })
      await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
    })
  

    test('User API allows read', async () => {
      await updateUser(userInfo, { access: access('read') })
      let res = await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
      expect(res.body).toEqual(expect.any(Array))
  
      await updateUser(userInfo, { access: access('rw') })
      res = await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
      expect(res.body).toEqual(expect.any(Array))
    })
    test('User API allows write', async () => {
      await updateUser(userInfo, { access: access('write') })
      let res = await request.post(url.api).set(header).expect(200).expect('Content-Type', /json/)
        .send({ [testKey]: "N5" })
      expect(res.body).toMatchObject({ [idKey]: expect.anything() })
  
      await updateUser(userInfo, { access: access('rw') })
      res = await request.post(url.api).set(header).expect(200).expect('Content-Type', /json/)
        .send({ [testKey]: "N6" })
      expect(res.body).toMatchObject({ [idKey]: expect.anything() })
    })
    test('User API disallows read', async () => {
      await updateUser(userInfo, { access: access('none') })
      await request.get(url.api).set(header).expect(403)
      
      await updateUser(userInfo, { access: access('write') })
      await request.get(url.api).set(header).expect(403)
    })
    test('User API disallows write', async () => {
      await updateUser(userInfo, { access: access('none') })
      await request.post(url.api).set(header).expect(403).send({ [testKey]: "N7" })
      
      await updateUser(userInfo, { access: access('read') })
      await request.post(url.api).set(header).expect(403).send({ [testKey]: "N8" })
    })

    test('Missing model access falls back to default', async () => {
      await updateUser(userInfo, { access: access('read') })
      await request.post(url.api).set(header).expect(403).send({ [testKey]: "N0" })
      let res = await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
      expect(res.body).toEqual(expect.any(Array))
      
      await updateUser(userInfo, { access: access('write') })
      await request.get(url.api).set(header).expect(403)
      res = await request.post(url.api).set(header).expect(200).expect('Content-Type', /json/)
        .send({ [testKey]: "N6" })
      expect(res.body).toMatchObject({ [idKey]: expect.anything() })
    })
  })


  describe('Admin Authentication', () => {
    test('Admin can login to GUI', async () => {
      await updateUser(userInfo, { role: new Role('admin') })
      await request.post('/login').send(creds).expect(302).expect('Location', url.success)
    })
    test('Admin fails GUI login while locked', async () => {
      await updateUser(userInfo, { locked: true })
      await request.post('/login').send(creds).expect(302).expect('Location', url.fail)
      await updateUser(userInfo, { locked: false })
      await request.post('/login').send(creds).expect(302).expect('Location', url.success)
    })
  })

})

// MOCKS
jest.mock('../../../src/models/_all')