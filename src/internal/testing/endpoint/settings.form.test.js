const server = require('../../server')
const request = require('supertest-session')(server)

const { readFile, writeFile } = require('fs/promises')
const { loadUserHelpers } = require('../test.utils')
const { envPath } = require('../../../config/meta')
const { createUser } = loadUserHelpers()

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
    objEnv.port = "12661"
    objEnv.LOG_CONSOLE = "test"
    objEnv.LOG_FILE = "none"
    objEnv.DB_SECRET = "testSecret"

    await request.post(`${envPrefix}/form`)
      .send({ ...objEnv, action: "Update" })
      .expect(302).expect('Location',envPrefix)
    
    expect(writeFile).toBeCalledTimes(1)
    const envFile = await readFile(envPath)

    expect(envFile).toContain("port=12661\n")
    expect(envFile).toContain("LOG_CONSOLE=test\n")
    expect(envFile).toContain("LOG_FILE=none\n")
    expect(envFile).toContain("DB_SECRET=testSecret\n")
  })

  test('POST /form Update w/ unescaped chars', async () => {
    objEnv.DB_DIR  = "\\path/to/db!"
    objEnv.LOG_DIR = "%5Cpath/to/log$"

    await request.post(`${envPrefix}/form`)
      .send({ ...objEnv, action: "Update" })
      .expect(302).expect('Location', envPrefix)
    
    expect(writeFile).toBeCalledTimes(1)
    const envFile = await readFile(envPath)

    expect(envFile).toContain("DB_DIR=\\path/to/db!\n")
    expect(envFile).toContain("LOG_DIR=%5Cpath/to/log$")
  })

  test('POST /form Default', async () => {
    objEnv.DB_DIR  = ""
    objEnv.LOG_DIR = ""

    await request.post(`${envPrefix}/form`)
      .send({ ...objEnv, action: "Default" })  
      .expect(302).expect('Location', envPrefix)
      
    expect(writeFile).toBeCalledTimes(1)
    const envFile = await readFile(envPath)

    // Default vals
    expect(envFile).toContain("NODE_ENV=development\n")
    expect(envFile).toContain("LOG_CONSOLE=info\n")
    expect(envFile).toContain("LOG_FILE=warn\n")
    expect(envFile).toContain("LOG_HTTP=common\n")
    expect(envFile).toContain("DB_DIR=\n")
    expect(envFile).toContain("LOG_DIR=\n")
    
    // Passthrough current val
    expect(envFile).toContain("port=12661\n")
    expect(envFile).toContain("DB_SECRET=testSecret\n")
  })

  test('POST /form Undo', async () => {
    await request.post(`${envPrefix}/form`)
      .send({ ...objEnv, action: "Undo" })
      .expect(302).expect('Location', envPrefix)
    
    expect(writeFile).toBeCalledTimes(1)
    const envFile = await readFile(envPath)

    expect(envFile).toContain("LOG_FILE=none\n")
    expect(envFile).toContain("LOG_CONSOLE=test\n")
  })

  test('POST /form Undo fail', async () => {
    expect.assertions(2)

    try { while (true) {
      await request.post(`${envPrefix}/form`)
        .send({ ...objEnv, action: "Undo" })
        .expect(302).expect('Location', envPrefix)
    }}
    catch (err) {
      expect(err.message).toContain('expected 302')
      expect(err.message).toContain('got 500')
    }

    await request.post(`${envPrefix}/form`)
      .send({ ...objEnv, action: "Undo" })
      .expect(500)
  })

  test('POST /form Restart page', async () => {
    await request.post(`${envPrefix}/form`)
      .send({ ...objEnv, action: "Restart" })
      .expect(418) // In TEST_ENV: Restart => <418>
  })

  test('POST /form Restart updates', async () => {
    objEnv.port = "12662"
    objEnv.LOG_CONSOLE = "newtest"

    await request.post(`${envPrefix}/form`)
      .send({ ...objEnv, action: "Restart" })
      .expect(418) // In TEST_ENV: Restart => <418>

    expect(writeFile).toBeCalledTimes(1)
    const envFile = await readFile(envPath)
    
    expect(envFile).toContain("port=12662\n")
    expect(envFile).toContain("LOG_CONSOLE=newtest\n")
  })
})


// MOCKS

jest.mock('fs/promises', function() {
  this.files = {}
  return ({
    writeFile: jest.fn((k, v) => Promise.resolve(this.files[k] = v)),
    readFile:  jest.fn((k) => Promise.resolve(this.files[k] || '')),
  })
})