const server = require('../../server')
const request = require('supertest-session')(server)
const { createUser, testModelData } = require('../endpoint.utils')
jest.mock('../../../models/_all', () => [ require('../Test.model') ])

const { Model, testKey, idKey, prefix } = testModelData
const creds = { username: 'test', password: 'password' }
const formUrl = `${prefix.gui}/form`

describe('Test User Profile Form Post', () => {
  let testId = 'NULL', otherId = 'NULL'
  beforeAll(async () => {
    await createUser({ ...creds, access: ['gui'] })
    await request.post('/login').send(creds)
  })
  test('User login works', async () => {
    await request.get('/login').expect(302).expect('Location','/gui/db')
  })

  test('Form Add', async () => {
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({
        action: "Add",
        [testKey]: "test"
      })
    
    testId = await Model.get()
      .then((list) => (list && list[0] && list[0][idKey]) ?? 'NULL')
    expect(testId).not.toBe('NULL')
    expect(await Model.get(testId)).toHaveProperty(testKey, "test")
  })

  test('Form Update', async () => {
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({
        action: "Update",
        [idKey]: testId,
        [testKey]: "new"
      })

    expect(await Model.get(testId)).toHaveProperty(testKey, "new")
  })

  test('Swap Button', async () => {
    otherId = await Model.add({ [testKey]: "other" }).then((id) => id ?? 'NULL')
    expect(otherId).not.toBe('NULL')

    const res = await request.post(`${prefix.gui}/swap`).expect(200).expect('Content-Type', /json/)
      .send({ [idKey]: testId, swap: otherId })
    
    expect(res.body).toEqual({ success: true })
    expect(await Model.get(testId)).toHaveProperty(testKey, "other")
    expect(await Model.get(otherId)).toHaveProperty(testKey, "new")
    testId = otherId
  })

  test('Form Search', async () => {
    await request.post(formUrl).expect(302)
      .expect('Location', `${prefix.gui}/results?${testKey}=text&${idKey}=12`)
      // .expect('Location', `${prefix.gui}/results?${idKey}=12&${testKey}=text`)
      .send({ action: "Search", [testKey]: "text", [idKey]: 12 })
  })

  test('Form Remove', async () => {
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({
        action: "Remove",
        [idKey]: testId,
      })
    expect(await Model.get(testId)).toBeFalsy()
  })

  test.todo('Test Validation')
  
  test.todo('Test ARRAY Validation (after implemented)')
})