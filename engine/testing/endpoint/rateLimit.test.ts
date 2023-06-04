import server from '../../server'
import supertest from 'supertest'
import { rateLimits } from '../../config/server.cfg'
import { type UserInfo, createUser, testModelData } from '../endpoint.utils'
import { Role } from '../../types/Users'
const request = supertest.agent(server)

const url = { success: '/gui/db', ...testModelData.prefix }
const creds = { username: 'test', password: 'password' }

describe('Test rate limiting', () => {
  let userInfo: UserInfo
  beforeAll(async () => {
    userInfo = await createUser({ ...creds, role: new Role('admin','api','gui') })
  })

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
      await new Promise((res) => setTimeout(res, rateLimits.gui.windowMs))
      await request.get(url.gui).set('X-Forwarded-For', 'GUI_IP').expect(200)
    })
  })

  describe('API', () => {
    let header: Record<string,string>
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
      await new Promise((res) => setTimeout(res, rateLimits.api.windowMs))
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
      await new Promise((res) => setTimeout(res, rateLimits.login.windowMs))
      await request.get('/login').set('X-Forwarded-For', 'LOGIN_IP').expect(302).expect('Location', url.success)
    })
  })
})

// MOCKS
jest.mock('../../config/server.cfg', () => ({
  ...jest.requireActual('../../config/server.cfg'),
  trustProxy: true,
  rateLimits: {
    gui:   { windowMs: 2000, max: 5 },
    api:   { windowMs: 1000, max: 3 },
    login: { windowMs:  500, max: 2 },
  },
}))
jest.mock('../../../src/models/_all')