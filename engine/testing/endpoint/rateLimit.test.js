const server = require('../../server')
const request = require('supertest-session')(server)

const { rateLimits } = require('../../config/server.cfg')
const { createUser, testModelData } = require('../endpoint.utils')
const url = { success: '/gui/db', ...testModelData.prefix }
const creds = { username: 'test', password: 'password' }

jest.mock(require('../../src.path').modelsPath, () => [ require('../Test.model') ])
jest.mock('../../config/server.cfg', () => ({
  ...jest.requireActual('../../config/server.cfg'),
  trustProxy: true,
  rateLimits: {
    gui:   { windowMs: 2000, max: 5 },
    api:   { windowMs: 1000, max: 3 },
    login: { windowMs:  500, max: 2 },
  }
}))

describe('Test rate limiting', () => {
  let userInfo
  beforeAll(async () => { userInfo = await createUser({ ...creds, access: ['api','gui','admin'] }) })

  test('login works', async () => {
    await request.post('/login').send(creds).expect(302).expect('Location', url.success)
  })

  describe('GUI', () => {
    test('Blocks after max attempts, new IP or waiting gets around block', async () => {
      // Block
      for (let i=0; i++ < 5; ) {
        await request.get(url.gui).set('X-Forwarded-For', 'GUI_IP').expect(200)
      }
      await request.get(url.gui).set('X-Forwarded-For', 'GUI_IP').expect(429)

      // New IP
      await request.get(url.gui).set('X-Forwarded-For', 'NEW_IP').expect(200)
      await request.get(url.gui).set('X-Forwarded-For', 'GUI_IP').expect(429)

      // Wait
      await new Promise(res => setTimeout(res, rateLimits.gui.windowMs))
      await request.get(url.gui).set('X-Forwarded-For', 'GUI_IP').expect(200)
    })
  })

  describe('API', () => {
    let header
    beforeAll(() => { header = { Authorization: `Bearer ${userInfo.token}`, 'X-Forwarded-For': 'API_IP' } })

    test('Blocks after max attempts, new IP or waiting gets around block', async () => {
      // Block
      for (let i=0; i++ < 3; ) {
        await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
      }
      await request.get(url.api).set(header).expect(429)

      // New IP
      header['X-Forwarded-For'] = 'NEW_IP'
      await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
      header['X-Forwarded-For'] = 'API_IP'
      await request.get(url.api).set(header).expect(429)

      // Wait
      await new Promise(res => setTimeout(res, rateLimits.api.windowMs))
      await request.get(url.api).set(header).expect(200).expect('Content-Type', /json/)
    })
  })

  describe('Login', () => {
    test('Blocks after max attempts, new IP or waiting gets around block', async () => {
      // Block
      for (let i=0; i++ < 2; ) {
        await request.get('/login').set('X-Forwarded-For', 'LOGIN_IP').expect(302).expect('Location', url.success)
      }
      await request.get('/login').set('X-Forwarded-For', 'LOGIN_IP').expect(429)

      // New IP
      await request.get('/login').set('X-Forwarded-For', 'NEW_IP').expect(302).expect('Location', url.success)
      await request.get('/login').set('X-Forwarded-For', 'LOGIN_IP').expect(429)

      // Wait
      await new Promise(res => setTimeout(res, rateLimits.login.windowMs))
      await request.get('/login').set('X-Forwarded-For', 'LOGIN_IP').expect(302).expect('Location', url.success)
    })
  })
})