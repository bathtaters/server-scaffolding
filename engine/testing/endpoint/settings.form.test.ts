import type { EnvObject } from '../../types/settings.d'
import server from '../../server'
import supertest from 'supertest'
import { readFile, writeFile } from 'fs/promises'
import { Role } from '../../types/Users'
import { envPath } from '../../config/meta'
import { createUser } from '../endpoint.utils'
import { metaField } from '../../types/gui'
import { settingsActions } from '../../types/settings'
const request = supertest.agent(server)

const settingsPrefix = '/admin/settings'

describe('Test ENV Form Post', () => {
  let settings: EnvObject = {
    NODE_ENV: "enviroment",
    port: "1234",
    LOG_CONSOLE: "logC",
    LOG_FILE: "logF",
    LOG_HTTP: "logH",
    TRUST_PROXY: "trustProxy",
    SESSION_SECRET: "testSession",
    DB_SECRET: "testDB",
    DB_DIR: "",
    LOG_DIR: "",
  }
  

  beforeAll(() => {
    const creds = { username: 'test', password: 'password', role: new Role('admin') }
    return createUser(creds).then(() => request.post('/login').send(creds))
  })

  test('User login works', async () => {
    await request.get('/login').expect(302).expect('Location','/admin/settings')
  })

  test('POST /form Update', async () => {
    settings.port = "12661"
    settings.LOG_CONSOLE = "test"
    settings.LOG_FILE = "none"
    settings.DB_SECRET = "testSecret"

    await request.post(`${settingsPrefix}/form`)
      .send({ ...settings, [metaField.button]: settingsActions.update })
      .expect(302).expect('Location',settingsPrefix)
    
    expect(writeFile).toBeCalledTimes(1)
    const envFile = await readFile(envPath)

    expect(envFile).toContain("port=12661\n")
    expect(envFile).toContain("LOG_CONSOLE=test\n")
    expect(envFile).toContain("LOG_FILE=none\n")
    expect(envFile).toContain("DB_SECRET=testSecret\n")
  })

  test('POST /form Update w/ unescaped chars', async () => {
    settings.DB_DIR  = "\\path/to/db!"
    settings.LOG_DIR = "%5Cpath/to/log$"

    await request.post(`${settingsPrefix}/form`)
      .send({ ...settings, [metaField.button]: settingsActions.update })
      .expect(302).expect('Location', settingsPrefix)
    
    expect(writeFile).toBeCalledTimes(1)
    const envFile = await readFile(envPath)

    expect(envFile).toContain("DB_DIR=\\path/to/db!\n")
    expect(envFile).toContain("LOG_DIR=%5Cpath/to/log$")
  })

  test('POST /form Default', async () => {
    settings.DB_DIR  = ""
    settings.LOG_DIR = ""

    await request.post(`${settingsPrefix}/form`)
      .send({ ...settings, [metaField.button]: settingsActions.default })  
      .expect(302).expect('Location', settingsPrefix)
      
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
    await request.post(`${settingsPrefix}/form`)
      .send({ ...settings, [metaField.button]: settingsActions.undo })
      .expect(302).expect('Location', settingsPrefix)
    
    expect(writeFile).toBeCalledTimes(1)
    const envFile = await readFile(envPath)

    expect(envFile).toContain("LOG_FILE=none\n")
    expect(envFile).toContain("LOG_CONSOLE=test\n")
  })

  test('POST /form Undo fail', async () => {
    expect.assertions(2)

    try { while (true) {
      await request.post(`${settingsPrefix}/form`)
        .send({ ...settings, [metaField.button]: settingsActions.undo })
        .expect(302).expect('Location', settingsPrefix)
    }}
    catch (err: any) {
      expect(err.message).toContain('expected 302')
      expect(err.message).toContain('got 500')
    }

    await request.post(`${settingsPrefix}/form`)
      .send({ ...settings, [metaField.button]: settingsActions.undo })
      .expect(500)
  })

  test('POST /form Restart page', async () => {
    await request.post(`${settingsPrefix}/form`)
      .send({ ...settings, [metaField.button]: settingsActions.restart })
      .expect(418) // In TEST_ENV: Restart => <418>
  })

  test('POST /form Restart updates', async () => {
    settings.port = "12662"
    settings.LOG_CONSOLE = "newtest"

    await request.post(`${settingsPrefix}/form`)
      .send({ ...settings, [metaField.button]: settingsActions.restart })
      .expect(418) // In TEST_ENV: Restart => <418>

    expect(writeFile).toBeCalledTimes(1)
    const envFile = await readFile(envPath)
    
    expect(envFile).toContain("port=12662\n")
    expect(envFile).toContain("LOG_CONSOLE=newtest\n")
  })
})


// MOCKS
jest.mock('fs/promises')