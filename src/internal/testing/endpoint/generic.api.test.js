const server = require('../../server')
const request = require('supertest')(server)
const { getApiHeader, testModelData } = require('../endpoint.utils')
jest.mock('../../../models/_all', () => [ require('../Test.model') ])

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
    expect(res.body).toEqual({ [idKey]: expect.anything() })
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

  test('DELETE /[id]', async () => {
    const del = await request.delete(`${prefix.api}/${swapId}`).set(header).expect(200).expect('Content-Type', /json/)
    expect(del.body).toEqual({ success: true })

    const items = await Model.get()
    expect(items).toHaveLength(1)
    expect(items).toContainEqual(expect.objectContaining({
      [idKey]: testId,
      [testKey]: "new",
    }))
  })

  test.todo('Test Validation')

  test.todo('Test ARRAY Validation (after implemented)')
})