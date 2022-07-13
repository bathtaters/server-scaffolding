const server = require('../../server')
const request = require('supertest-session')(server)

const { getEnv, canUndo } = require('../../services/settings.services')
const { createUser } = require('../test.utils')

const envPrefix = '/admin/settings'

describe('Test ENV Form Post', () => {
  beforeAll(() => {
    const creds = { username: 'test', password: 'password', access: ['admin'] }
    return createUser(creds).then(() => request.post('/login').send(creds))
  })

  test('User login works', async () => {
    await request.get('/login').expect(302).expect('Location','/admin/settings')
  })

  test('POST /form Update', async () => {
    expect(getEnv()).not.toEqual(expect.objectContaining({
      port: 12661,
      LOG_CONSOLE: "test",
    }))

    await request.post(`${envPrefix}/form`).expect(302).expect('Location',envPrefix)
      .send({
        ...getEnv(),
        action: "Update",
        port: "12661",
        LOG_CONSOLE: "test",
      })

    expect(getEnv()).toEqual(expect.objectContaining({
      port: 12661,
      LOG_CONSOLE: "test",
    }))
  })

  test('POST /form Default', async () => {
    await request.post(`${envPrefix}/form`).expect(302).expect('Location',envPrefix)
      .send({
        ...getEnv(),
        action: "Default",
      })

    expect(getEnv()).toEqual(expect.objectContaining({
      port: "8080",
      LOG_CONSOLE: "info",
    }))
  })

  test('POST /form Undo', async () => {
    await request.post(`${envPrefix}/form`).expect(302).expect('Location',envPrefix)
      .send({
        ...getEnv(),
        action: "Undo",
      })

    expect(getEnv()).toEqual(expect.objectContaining({
      port: 12661,
      LOG_CONSOLE: "test",
    }))
  })

  test('POST /form Undo limit', async () => {
    while (canUndo()) {
      await request.post(`${envPrefix}/form`).expect(302).expect('Location',envPrefix)
        .send({
          ...getEnv(),
          action: "Undo",
        })
    }

    await request.post(`${envPrefix}/form`).expect(400)
  })

  test('POST /form Restart page', async () => {
    await request.post(`${envPrefix}/form`).expect(200).expect('Content-Type', /html/)
      .send({
        ...getEnv(),
        action: "Restart",
      })
  })

  test('POST /form Restart updates', async () => {
    expect(getEnv()).not.toEqual(expect.objectContaining({
      port: 12662,
      LOG_CONSOLE: "newtest",
    }))

    await request.post(`${envPrefix}/form`).expect(200).expect('Content-Type', /html/)
      .send({
        ...getEnv(),
        action: "Restart",
        port: "12662",
        LOG_CONSOLE: "newtest",
      })

    expect(getEnv()).toEqual(expect.objectContaining({
      port: 12662,
      LOG_CONSOLE: "newtest",
    }))
  })
})