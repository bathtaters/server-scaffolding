const server = require('../../server')
const request = require('supertest-session')(server)
const { createUser, updateUser, testModelData } = require('../endpoint.utils')
jest.mock(require('../../src.path').modelsPath, () => [ require('../Test.model') ])


const { Model, testKey, idKey, prefix } = testModelData
const url = { success: '/gui/db', fail: '/login', ...prefix }
const creds = { username: 'test', password: 'password' }
const read = 1, write = 2

describe('Test User Authentication', () => {
  let userInfo
  beforeAll(async () => { userInfo = await createUser({ ...creds }) })


  describe('GUI Authentication', () => {
    test('Login fails while locked', async () => {
      await updateUser(userInfo, { access: ['api','gui'], locked: true })
      await request.post('/login').send(creds).expect(302).expect('Location', url.fail)
      await updateUser(userInfo, { locked: false })
      await request.post('/login').send(creds).expect(302).expect('Location', url.success)
    })
    test('API login fails', async () => {
      await updateUser(userInfo, { access: ['api'] })
      await request.post('/login').send(creds).expect(302).expect('Location', url.fail)
    })
    test('GUI login works', async () => {
      await updateUser(userInfo, { access: ['gui'] })
      await request.post('/login').send(creds).expect(302).expect('Location', url.success)
    })
  

    test('User GUI allows read', async () => {
      await updateUser(userInfo, { models: { [Model.title]: read | write } })
      await request.post(`${url.gui}/form/search`).expect(302).expect('Location', url.gui)
  
      await updateUser(userInfo, { models: { [Model.title]: read } })
      await request.post(`${url.gui}/form/search`).expect(302).expect('Location', url.gui)
    })
    test('User GUI allows write', async () => {
      await updateUser(userInfo, { models: { [Model.title]: read | write } })
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N1" })
        .expect(302).expect('Location', url.gui)
  
      await updateUser(userInfo, { models: { [Model.title]: write } })
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N2" })
        .expect(302).expect('Location', url.gui)
    })
    test('User GUI disallows writes', async () => {
      await updateUser(userInfo, { models: { [Model.title]: 0 } })
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N3" }).expect(403)
  
      await updateUser(userInfo, { models: { [Model.title]: read } })
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N4" }).expect(403)
    })
    test('User GUI disallows reads', async () => {
      await updateUser(userInfo, { models: { [Model.title]: 0 } })
      await request.post(`${url.gui}/form/search`).expect(403)
  
      await updateUser(userInfo, { models: { [Model.title]: write } })
      await request.post(`${url.gui}/form/search`).expect(403)
    })


    test('Missing model access falls back to default', async () => {
      await updateUser(userInfo, { models: { default: read } })
      await request.post(`${url.gui}/form/add`).expect(403).send({ [testKey]: "N9" })
      await request.post(`${url.gui}/form/search`).expect(302).expect('Location', url.gui)
      
      await updateUser(userInfo, { models: { default: write } })
      await request.post(`${url.gui}/form/search`).expect(403)
      await request.post(`${url.gui}/form/add`).send({ [testKey]: "N6" })
        .expect(302).expect('Location', url.gui)
    })
  })



  describe('API Authentication', () => {
    let header
    beforeAll(() => { header = { Authorization: `Bearer ${userInfo.token}` } })

    test('User request fails while locked', async () => {
      await updateUser(userInfo, { access: ['api','gui'], models: { default: read | write }, locked: true })
      await request.get(url.api).set(header).expect(403)
      await updateUser(userInfo, { locked: false })
      await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
    })
    test('GUI User request fails', async () => {
      await updateUser(userInfo, { access: ['gui'], models: { default: read | write } })
      await request.get(url.api).set(header).expect(403)
    })
    test('API User request works', async () => {
      await updateUser(userInfo, { access: ['api'], models: { default: read | write } })
      await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
    })
  

    test('User API allows read', async () => {
      await updateUser(userInfo, { models: { default: read } })
      let res = await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
      expect(res.body).toEqual(expect.any(Array))
  
      await updateUser(userInfo, { models: { default: read | write } })
      res = await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
      expect(res.body).toEqual(expect.any(Array))
    })
    test('User API allows write', async () => {
      await updateUser(userInfo, { models: { default: write } })
      let res = await request.post(url.api).set(header).expect(200).expect('Content-Type', /json/)
        .send({ [testKey]: "N5" })
      expect(res.body).toMatchObject({ [idKey]: expect.anything() })
  
      await updateUser(userInfo, { models: { default: read | write } })
      res = await request.post(url.api).set(header).expect(200).expect('Content-Type', /json/)
        .send({ [testKey]: "N6" })
      expect(res.body).toMatchObject({ [idKey]: expect.anything() })
    })
    test('User API disallows read', async () => {
      await updateUser(userInfo, { models: { default: 0 } })
      await request.get(url.api).set(header).expect(403)
      
      await updateUser(userInfo, { models: { default: write } })
      await request.get(url.api).set(header).expect(403)
    })
    test('User API disallows write', async () => {
      await updateUser(userInfo, { models: { default: 0 } })
      await request.post(url.api).set(header).expect(403).send({ [testKey]: "N7" })
      
      await updateUser(userInfo, { models: { default: read } })
      await request.post(url.api).set(header).expect(403).send({ [testKey]: "N8" })
    })

    test('Missing model access falls back to default', async () => {
      await updateUser(userInfo, { models: { default: read } })
      await request.post(url.api).set(header).expect(403).send({ [testKey]: "N0" })
      let res = await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
      expect(res.body).toEqual(expect.any(Array))
      
      await updateUser(userInfo, { models: { default: write } })
      await request.get(url.api).set(header).expect(403)
      res = await request.post(url.api).set(header).expect(200).expect('Content-Type', /json/)
        .send({ [testKey]: "N6" })
      expect(res.body).toMatchObject({ [idKey]: expect.anything() })
    })
  })


  describe('Admin Authentication', () => {
    test('Admin can login to GUI', async () => {
      await updateUser(userInfo, { access: ['admin'] })
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