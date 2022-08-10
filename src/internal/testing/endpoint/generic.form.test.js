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
        _action: "Add",
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
        _action: "Update",
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
      .send({ _action: "Search", [testKey]: "text", [idKey]: 12 })
  })

  // VALIDATION
  test('VALIDATION - Int type', async () => {
    let res = await request.post(`${prefix.gui}/swap`).expect(400).expect('Content-Type', /json/)
      .send({ [idKey]: testId, swap: 'test' })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^swap must be int/))
    res = await request.post(`${prefix.gui}/swap`).expect(400).expect('Content-Type', /json/)
      .send({[idKey]: testId, swap: 12.34 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^swap must be int/))
  })
  test('VALIDATION - Int min/max', async () => {
    let res = await request.post(`${prefix.gui}/swap`).expect(400).expect('Content-Type', /json/)
      .send({ [idKey]: testId, swap: -12 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^swap must be int/))
    res = await request.post(`${prefix.gui}/swap`).expect(400).expect('Content-Type', /json/)
      .send({ [idKey]: testId, swap: 12345 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^swap must be int/))
  })
  test('VALIDATION - String type', async () => {
    let res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, name: { a: 1, b: 2, c: 3 } })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/name not a valid string/)
    res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, name: 12345 })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/name not a valid string/)
    res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, name: true })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/name not a valid string/)
  })
  test('VALIDATION - String min/max', async () => {
    let res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, name: 'a' })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/name must be string/)
    res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, name: 'b'.repeat(101) })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/name must be string/)
  })
  test('VALIDATION - Boolean type', async () => {
    let res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, isOn: 'test' })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/isOn not a valid boolean/)
    res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, isOn: [] })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/isOn not a valid boolean/)
  })
  test('VALIDATION - Float type', async () => {
    let res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, number: 'test' })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/number must be float/)
    res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, number: { a: 1, b: 2 } })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/number must be float/)
    res = await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({ _action: "Update", [idKey]: testId, number: "12.34" })
    expect(await Model.get(testId)).toHaveProperty('number', 12.34)
  })
  test('VALIDATION - Float min/max', async () => {
    let res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, number: -1234 })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/number must be float/)
    res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, number: 1234 })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/number must be float/)
  })
  test('VALIDATION - Date type', async () => {
    let res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, testDate: '1659506704082' })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/testDate not a valid timestamp/)
    res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, testDate: 1659506704082 })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/testDate not a valid timestamp/)
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({ _action: "Update", [idKey]: testId, testDate: "2020-06-11T04:38" })
    expect(await Model.get(testId)).toHaveProperty('testDate', new Date("2020-06-11T04:38"))
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({ _action: "Update", [idKey]: testId, testDate: new Date("2021-12-16T09:14") })
    expect(await Model.get(testId)).toHaveProperty('testDate', new Date("2021-12-16T09:14"))
  })
  test('VALIDATION - Array type', async () => {
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({ _action: "Update", [idKey]: testId, objectList: '{"a":1}' })
    expect(await Model.get(testId)).toHaveProperty('objectList', [{ a: 1 }])
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({ _action: "Update", [idKey]: testId, objectList: '{"a":1},{"b":2,"c":3}' })
    expect(await Model.get(testId)).toHaveProperty('objectList', [{ a: 1 }, { b: 2, c: 3 }])
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({ _action: "Update", [idKey]: testId, objectList: '[{"a":1}, {"b":2,"c":3}]' })
    expect(await Model.get(testId)).toHaveProperty('objectList', [{ a: 1 }, { b: 2, c: 3 }])
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({ _action: "Update", [idKey]: testId, objectList: ['{"a":1}', '{"b":2,"c":3}'] })
    expect(await Model.get(testId)).toHaveProperty('objectList', [{ a: 1 }, { b: 2, c: 3 }])
  })
  test('VALIDATION - Array max', async () => {
    let res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, objectList: Array(21).fill('{}') })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/objectList must be array/)
  })
  test('VALIDATION - Object type', async () => {
    let res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, objectList: ['test'] })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/objectList\[0\] not a valid object/)
    res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, objectList: ['{"a":false}',false] })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/objectList\[1\] not a valid object/)
    res = await request.post(formUrl).expect(400)
      .send({ _action: "Update", [idKey]: testId, objectList: [{ a: 1 }] })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/objectList\[0\] not a valid object/)
  })

  test('Form Remove', async () => {
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({
        _action: "Remove",
        [idKey]: testId,
      })
    expect(await Model.get(testId)).toBeFalsy()
  })

  test('VALIDATION - required', async () => {
    // ERROR <502>: SQLite Error - NOT NULL constraint
    let res = await request.post(formUrl).expect(400)
      .send({ _action: "Add", number: 24 })
    expect(res.text).toMatch(/Validation Error/)
    expect(res.text).toMatch(/name must be included/)
  })

  test('VALIDATION - defaults', async () => {
    await request.post(formUrl).expect(302).expect('Location',prefix.gui)
      .send({ _action: "Add", name: "test" })
    
    const newId = await Model.get()
      .then((list) => (list && list[0] && list[0][idKey]) ?? 'NULL')
    expect(newId).not.toBe('NULL')
    expect(await Model.get(newId)).toEqual(expect.objectContaining({
      // Test defaults
      number: -1, isOn: true, testDate: new Date("2000-01-02T00:00"),
    }))
    await Model.remove(newId)
  })
})