const server = require('../../server')
const request = require('supertest')(server)
const { getModelTestData, getApiHeader } = require('../endpoint.utils')

const { testKey, testIsInt, idKey, apiPrefix, Model } = getModelTestData()

describe('Test model API', () => {
  let header, testId, swapId
  beforeAll(() => getApiHeader().then((token) => header = token))

  test('User token works', async () => {
    await request.get(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
  })

  test('POST /', async () => {
    const res = await request.post(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
      .send({ [testKey]: testIsInt ? 12 : "test" })
    expect(res.body).toEqual({ [idKey]: expect.anything() })
    testId = res.body[idKey]
  })

  test('GET /', async () => {
    await request.post(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
      .send({ [testKey]: testIsInt ? 24 : "test2" })
      .then((res) => { swapId = res.body[idKey] })
    

    const res = await request.get(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toHaveLength(2)
    expect(res.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        [idKey]: testId,
        [testKey]: testIsInt ? 12 : "test",
      }),
      expect.objectContaining({
        [idKey]: swapId,
        [testKey]: testIsInt ? 24 : "test2",
      })
    ]))
  })

  test('GET /[id]', async () => {
    const res = await request.get(`${apiPrefix}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toEqual(expect.objectContaining({
      [idKey]: testId,
      [testKey]: testIsInt ? 12 : "test",
    }))
  })

  test('POST /swap', async () => {
    const swap = await request.post(`${apiPrefix}/swap`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ [idKey]: testId, swap: swapId })
    expect(swap.body).toEqual({ success: true })

    const res = await request.get(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toHaveLength(2)
    expect(res.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        [idKey]: testId,
        [testKey]: testIsInt ? 24 : "test2",
      }),
      expect.objectContaining({
        [idKey]: swapId,
        [testKey]: testIsInt ? 7 : "test",
      })
    ]))
  })

  test('UPDATE /[id]', async () => {
    const update = await request.put(`${apiPrefix}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ [testKey]: testIsInt ? 7 : "new" })
    expect(update.body).toEqual({ success: true })

    const item = await Model.get(testId)
    expect(item[testKey]).toBe(testIsInt ? 7 : "new")
  })

  test('DELETE /[id]', async () => {
    const del = await request.delete(`${apiPrefix}/${swapId}`).set(header).expect(200).expect('Content-Type', /json/)
    expect(del.body).toEqual({ success: true })

    const items = await Model.get()
    expect(items).toHaveLength(1)
    expect(items).toContainEqual(expect.objectContaining({
      [idKey]: testId,
      [testKey]: testIsInt ? 7 : "new",
    }))
  })
})