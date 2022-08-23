const { authorizeBearer, authorizeUser, storeUser, loadUser } = require('../../services/auth.services')
const errors = require('../../config/errors.engine')

const doneCb = jest.fn()
const mockModel = {
  name: 'mockModel',
  primaryId: 'testID',
  get:           jest.fn(() => Promise.resolve()),
  checkToken:    jest.fn(() => Promise.resolve()),
  checkPassword: jest.fn(() => Promise.resolve()),
}


describe('authorizeBearer', () => {
  const authFunc = authorizeBearer(mockModel, 'TEST_ACCESS')

  it('calls checkToken w/ expected args', async () => {
    await authFunc('TEST_TOKEN', doneCb)
    expect(mockModel.checkToken).toBeCalledTimes(1)
    expect(mockModel.checkToken).toBeCalledWith('TEST_TOKEN', 'TEST_ACCESS')
  })
  it('returns valid user', async () => {
    mockModel.checkToken.mockResolvedValueOnce({ testID: 'VALID_USER' })
    await authFunc('TEST_TOKEN', doneCb)
    expect(doneCb).toBeCalledTimes(1)
    expect(doneCb).toBeCalledWith(null, { testID: 'VALID_USER' })
  })
  it('returns badTokenErr on undefined', async () => {
    mockModel.checkToken.mockResolvedValueOnce(undefined)
    await authFunc('TEST_TOKEN', doneCb)
    expect(doneCb).toBeCalledTimes(1)
    expect(doneCb).toBeCalledWith(errors.badToken())
  })
  it('returns noAccessErr on other falsy', async () => {
    mockModel.checkToken.mockResolvedValueOnce(0)
    await authFunc('TEST_TOKEN', doneCb)
    expect(doneCb).toBeCalledTimes(1)
    expect(doneCb).toBeCalledWith(errors.noAccess())
  })
})


describe('authorizeUser', () => {
  const authFunc = authorizeUser(mockModel, 'TEST_ACCESS')

  it('calls checkPassword', async () => {
    await authFunc('TEST_USER', 'TEST_PW', doneCb)
    expect(mockModel.checkPassword).toBeCalledTimes(1)
    expect(mockModel.checkPassword).toBeCalledWith('TEST_USER', 'TEST_PW', 'TEST_ACCESS')
  })
  it('returns valid user', async () => {
    mockModel.checkPassword.mockResolvedValueOnce({ testID: 'VALID_USER' })
    await authFunc('TEST_USER', 'TEST_PW', doneCb)
    expect(doneCb).toBeCalledTimes(1)
    expect(doneCb).toBeCalledWith(null, { testID: 'VALID_USER' })
  })
  it('returns no user on falsy', async () => {
    mockModel.checkPassword.mockResolvedValueOnce(0)
    await authFunc('TEST_USER', 'TEST_PW', doneCb)
    expect(doneCb).toBeCalledTimes(1)
    expect(doneCb).toBeCalledWith(null, false)
  })
  it('returns no user + message on fail', async () => {
    mockModel.checkPassword.mockResolvedValueOnce({ fail: 'FAIL_MSG' })
    await authFunc('TEST_USER', 'TEST_PW', doneCb)
    expect(doneCb).toBeCalledTimes(1)
    expect(doneCb).toBeCalledWith(null, false, { message: 'FAIL_MSG' })
  })
})


describe('storeUser', () => {
  it('gets ID from user', () => {
    storeUser(mockModel)({ testID: 'TEST_ID' }, doneCb)
    expect(doneCb).toBeCalledTimes(1)
    expect(doneCb).toBeCalledWith(null, 'TEST_ID')
  })
})


describe('loadUser', () => {
  const loadFunc = loadUser(mockModel, 'TEST_ACCESS')

  it('calls get w/ expected args', async () => {
    await loadFunc('TEST_ID', doneCb)
    expect(mockModel.get).toBeCalledTimes(1)
    expect(mockModel.get).toBeCalledWith('TEST_ID', null, false, 'TEST_ACCESS', true)
  })
  it('returns valid user', async () => {
    mockModel.get.mockResolvedValueOnce({ testID: 'VALID_USER' })
    await loadFunc('TEST_ID', doneCb)
    expect(doneCb).toBeCalledTimes(1)
    expect(doneCb).toBeCalledWith(null, { testID: 'VALID_USER' }, undefined)
  })
  it('returns no user + noUserErr on falsy', async () => {
    mockModel.get.mockResolvedValueOnce(0)
    await loadFunc('TEST_ID', doneCb)
    expect(doneCb).toBeCalledTimes(1)
    expect(doneCb).toBeCalledWith(null, false, errors.noUser())
  })
})
