const server = require('../../server')
const request = require('supertest')(server)
const { getApiHeader, testModelData } = require('../endpoint.utils')
jest.mock(require('../../src.path').modelsPath, () => [ require('../Test.model') ])

const { Model, testKey, idKey, prefix } = testModelData

describe('Test model API', () => {
  let header, testId, swapId
  beforeAll(() => getApiHeader().then((token) => header = token))

  test('User token works', async () => {
    await request.get(prefix.api).set(header).expect(200).expect('Content-Type', /json/)
  })

  test('POST /', async () => {
    const res = await request.post(prefix.api).set(header).expect(200).expect('Content-Type', /json/)
      .send({ [testKey]: "test" })
    expect(res.body).toMatchObject({ [idKey]: expect.anything() })
    testId = res.body[idKey]
  })

  test('GET /', async () => {
    await request.post(prefix.api).set(header).expect(200).expect('Content-Type', /json/)
      .send({ [testKey]: "test2" })
      .then((res) => { swapId = res.body[idKey] })
    

    const res = await request.get(prefix.api).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toHaveLength(2)
    expect(res.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        [idKey]: testId,
        [testKey]: "test",
      }),
      expect.objectContaining({
        [idKey]: swapId,
        [testKey]: "test2",
      })
    ]))
  })

  test('GET /[id]', async () => {
    const res = await request.get(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toEqual(expect.objectContaining({
      [idKey]: testId,
      [testKey]: "test",
    }))
  })

  test('POST /swap', async () => {
    const swap = await request.post(`${prefix.api}/swap`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ [idKey]: testId, swap: swapId })
    expect(swap.body).toEqual({ success: true })

    const res = await request.get(prefix.api).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toHaveLength(2)
    expect(res.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        [idKey]: testId,
        [testKey]: "test2",
      }),
      expect.objectContaining({
        [idKey]: swapId,
        [testKey]: "test",
      })
    ]))
  })

  test('UPDATE /[id]', async () => {
    const update = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ [testKey]: "new" })
    expect(update.body).toEqual({ success: true })

    const item = await Model.get(testId)
    expect(item[testKey]).toBe("new")
  })

  // VALIDATION
  test('VALIDATION - String type', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ name: { a: 1, b: 2, c: 3 } })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^name not a valid string/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ name: 12345 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^name not a valid string/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ name: true })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^name not a valid string/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ name: 'valid' })
    expect(await Model.get(testId)).toHaveProperty('name', 'valid')
  })
  test('VALIDATION - String min/max', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ name: 'a' })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^name must be string/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ name: 'b'.repeat(101) })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^name must be string/))
  })
  test('VALIDATION - Boolean type', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ isOn: 'test' })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^isOn not a valid boolean/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ isOn: [] })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^isOn not a valid boolean/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ isOn: true })
    expect(await Model.get(testId)).toHaveProperty('isOn', true)
  })
  test('VALIDATION - Int type', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ testId: 'test' })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^testId must be int/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ testId: 12.34 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^testId must be int/))
  })
  test('VALIDATION - Int min/max', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ testId: -12 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^testId must be int/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ testId: 12345 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^testId must be int/))
  })
  test('VALIDATION - Float type', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ number: 'test' })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^number must be float/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ number: { a: 1, b: 2 } })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^number must be float/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ number: "12.34" })
    expect(await Model.get(testId)).toHaveProperty('number', 12.34)
  })
  test('VALIDATION - Float min/max', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ number: -1234 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^number must be float/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ number: 1234 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^number must be float/))
  })
  test('VALIDATION - Date type', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ testDate: '1659506704082' })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^testDate not a valid timestamp/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ testDate: 1659506704082 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^testDate not a valid timestamp/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ testDate: "2020-06-11T04:38" })
    expect(await Model.get(testId)).toHaveProperty('testDate', new Date("2020-06-11T04:38"))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ testDate: new Date("2021-12-16T09:14") })
    expect(await Model.get(testId)).toHaveProperty('testDate', new Date("2021-12-16T09:14"))
  })
  test('VALIDATION - Array type', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ objectList: '{"a":1}' })
    expect(await Model.get(testId)).toHaveProperty('objectList', [{ a: 1 }])
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ objectList: '{"a":1},{"b":2,"c":3}' })
    expect(await Model.get(testId)).toHaveProperty('objectList', [{ a: 1 }, { b: 2, c: 3 }])
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ objectList: '[{"a":1}, {"b":2,"c":3}]' })
    expect(await Model.get(testId)).toHaveProperty('objectList', [{ a: 1 }, { b: 2, c: 3 }])
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ objectList: ['{"a":1}', '{"b":2,"c":3}'] })
    expect(await Model.get(testId)).toHaveProperty('objectList', [{ a: 1 }, { b: 2, c: 3 }])
  })
  test('VALIDATION - Array max', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ objectList: Array(21).fill('{}') })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^objectList must be array/))
  })
  test('VALIDATION - Object type', async () => {
    let res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ objectList: ['test'] })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^objectList\[0\] not a valid object/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ objectList: ['{"a":false}',false] })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^objectList\[1\] not a valid object/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(400).expect('Content-Type', /json/)
      .send({ objectList: [{a: 1}] })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringMatching(/^objectList\[0\] not a valid object/))
    res = await request.put(`${prefix.api}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ objectList: '{"a": 1}, {"b": 2}' })
    expect(await Model.get(testId)).toHaveProperty('objectList', [{ a: 1 }, { b: 2 }])
  })

  test('DELETE /[id]', async () => {
    const del = await request.delete(`${prefix.api}/${swapId}`).set(header).expect(200).expect('Content-Type', /json/)
    expect(del.body).toEqual({ success: true })

    const items = await Model.get()
    expect(items).toHaveLength(1)
    expect(items).toContainEqual(expect.objectContaining({ [idKey]: testId }))
  })

  test('VALIDATION - required', async () => {
    const res = await request.post(prefix.api).set(header).expect(400).expect('Content-Type', /json/)
      .send({ number: 24 })
    expect(res.body.error).toHaveProperty('name','ValidationError')
    expect(res.body.error).toHaveProperty('message',expect.stringContaining('name must be included'))
  })

  test('VALIDATION - defaults', async () => {
    const res = await request.post(prefix.api).set(header).expect(200).expect('Content-Type', /json/)
      .send({ name: "test" })

    const newId = res.body[idKey]
    expect(await Model.get(newId)).toEqual(expect.objectContaining({
      // Test defaults
      number: -1, isOn: true, testDate: new Date("2000-01-02T00:00"),
    }))
    await Model.remove(newId)
  })
})