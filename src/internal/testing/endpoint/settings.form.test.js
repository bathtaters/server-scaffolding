const server = require('../../server')
const request = require('supertest-session')(server)

const { readFile, writeFile } = require('fs/promises')
const { canUndo } = require('../../services/settings.services')
const { createUser, expectEnvWrite } = require('../test.utils')

const envPrefix = '/admin/settings'

describe('Test ENV Form Post', () => {
  const objEnv = {
    NODE_ENV: "enviroment",
    port: "1234",
    LOG_CONSOLE: "logC",
    LOG_FILE: "logF",
    LOG_HTTP: "logH",
    SESSION_SECRET: "testSession",
    DB_SECRET: "testDB",
    DB_DIR: "",
    LOG_DIR: "",
  }
  

  beforeAll(() => {
    const creds = { username: 'test', password: 'password', access: ['admin'] }
    return createUser(creds).then(() => request.post('/login').send(creds))
  })

  test('User login works', async () => {
    await request.get('/login').expect(302).expect('Location','/admin/settings')
  })

  test('POST /form Update', async () => {
    await request.post(`${envPrefix}/form`).expect(302).expect('Location',envPrefix)
      .send({
        ...objEnv,
        action: "Update",
        port: "12661",
        LOG_CONSOLE: "test",
        LOG_FILE: "none",
        DB_SECRET: "testSecret",
      })
    
    expect(writeFile).toBeCalledTimes(1)
    expectEnvWrite(writeFile, {
      port: "12661",
      LOG_CONSOLE: "test",
      LOG_FILE: "none",
      DB_SECRET: "testSecret",
    })
  })

  test('POST /form Default', async () => {
    readFile.mockResolvedValueOnce('port=current\nDB_SECRET=passthrough\n')
    await request.post(`${envPrefix}/form`).expect(302).expect('Location',envPrefix)
      .send({
        ...objEnv,
        action: "Default",
      })
    
    expect(writeFile).toBeCalledTimes(1)
    // Default vals
    expectEnvWrite(writeFile, {
      NODE_ENV: "development",
      LOG_CONSOLE: "info",
      LOG_FILE: "warn",
      LOG_HTTP: "common",
      DB_DIR: "", LOG_DIR: ""
    })
    // Passthrough current val
    expectEnvWrite(writeFile, {
      port: "current",
      DB_SECRET: "passthrough",
    })
  })

  test.todo('Test UNDO')
  /*test('POST /form Undo', async () => {
    const env = await getEnv()
    await request.post(`${envPrefix}/form`).expect(302).expect('Location',envPrefix)
      .send({
        ...env,
        action: "Undo",
      })

    expect(await getEnv()).toEqual(expect.objectContaining({
      LOG_FILE: "none",
      LOG_CONSOLE: "test",
    }))
  })

  test('POST /form Undo limit', async () => {
    const env = await getEnv()
    while (canUndo()) {
      await request.post(`${envPrefix}/form`).expect(302).expect('Location',envPrefix)
        .send({
          ...env,
          action: "Undo",
        })
    }

    await request.post(`${envPrefix}/form`).expect(500).send({
      ...env,
      action: "Undo",
    })
  })*/

  test('POST /form Restart page', async () => {
    await request.post(`${envPrefix}/form`).expect(418) // Restart in TEST_ENV => 418
      .send({
        ...objEnv,
        action: "Restart",
      })
  })

  test('POST /form Restart updates', async () => {
    await request.post(`${envPrefix}/form`).expect(418) // Restart in TEST_ENV => 418
      .send({
        ...objEnv,
        action: "Restart",
        port: "12662",
        LOG_CONSOLE: "newtest",
      })

      expectEnvWrite(writeFile, {
        port: 12662,
        LOG_CONSOLE: "newtest",
      })
  })
})

// MOCKS
jest.mock('fs/promises', () => ({
  readFile:  jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
}))