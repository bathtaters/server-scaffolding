const server = require('../../internal/server')
const request = require('supertest')(server)

const { getApiHeader } = require('../../internal/testing/endpoint.utils')

const apiPrefix = '/api/base'

describe('Test Base model API', () => {
  let header, testId
  beforeAll(() => getApiHeader().then((token) => header = token))

  test('User token works', async () => {
    await request.get(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
  })

  test('POST /', async () => {
    const res = await request.post(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
      .send({
        data: "test"
      })
    expect(res.body).toEqual({ id: expect.any(Number) })
    testId = res.body.id
  })

  test('POST / + id', async () => {
    const res = await request.post(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
      .send({
        id: 12,
        data: "idTest"
      })
    expect(res.body).toEqual({ id: 12 })
  })

  test('GET /', async () => {
    const res = await request.get(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toHaveLength(2)
    expect(res.body).toEqual(expect.arrayContaining([
      {
        id: testId,
        data: "test"
      },{
        id: 12,
        data: "idTest"
      }
    ]))
  })

  test('GET /[id]', async () => {
    const res = await request.get(`${apiPrefix}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toEqual({
      id: testId,
      data: "test"
    })
  })

  test('UPDATE /[id]', async () => {
    const update = await request.put(`${apiPrefix}/12`).set(header).expect(200).expect('Content-Type', /json/)
      .send({
        data: "new"
      })
    expect(update.body).toEqual({ success: true })

    const res = await request.get(`${apiPrefix}/12`).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toEqual({
      id: 12,
      data: "new"
    })
  })

  test('POST /swap', async () => {
    const swap = await request.post(`${apiPrefix}/swap`).set(header).expect(200).expect('Content-Type', /json/)
      .send({ id: testId, swap: 12 })
    expect(swap.body).toEqual({ success: true })

    const res = await request.get(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toHaveLength(2)
    expect(res.body).toEqual(expect.arrayContaining([
      {
        id: 12,
        data: "test"
      },{
        id: testId,
        data: "new"
      }
    ]))
  })

  test('DELETE /[id]', async () => {
    const del = await request.delete(`${apiPrefix}/${testId}`).set(header).expect(200).expect('Content-Type', /json/)
    expect(del.body).toEqual({ success: true })

    const res = await request.get(apiPrefix).set(header).expect(200).expect('Content-Type', /json/)
    expect(res.body).toHaveLength(1)
    expect(res.body).toEqual(expect.arrayContaining([
      {
        id: 12,
        data: "test"
      }
    ]))
  })
})