const { restartCluster } = require('../../services/pm2.services')
const { connect, disconnect, list, restart } = require('../../utils/pm2.promises')
const appName = require('../../../config/meta').name

describe('pm2 services testing', () => {
  beforeEach(() => {
    process.env.NODE_APP_INSTANCE = "102"
    list.mockResolvedValueOnce([
      { name: appName, pm_id: 911, pm2_env: { NODE_APP_INSTANCE: "101" } },
      { name: appName, pm_id: 912, pm2_env: { NODE_APP_INSTANCE: "102" } },
      { name: appName, pm_id: 913, pm2_env: { NODE_APP_INSTANCE: "103" } },
      { name: 'other', pm_id: 914, pm2_env: { NODE_APP_INSTANCE: "220" } },
    ])
  })

  it('connects & disconnects', async () => {
    await restartCluster({})
    expect(connect).toBeCalledTimes(1)
    expect(disconnect).toBeCalledTimes(1)
  })
  it('restarts list items w/ appName', async () => {
    await restartCluster({})
    expect(restart).toBeCalledTimes(3)
    expect(restart).toBeCalledWith(911, expect.anything())
    expect(restart).toBeCalledWith(912, expect.anything())
    expect(restart).toBeCalledWith(913, expect.anything())
  })
  it('restarts self last', async () => {
    await restartCluster({})
    expect(restart).toBeCalledTimes(3)
    expect(restart).toHaveBeenNthCalledWith(3, 912, expect.anything())
  })
  it('sets APP_INSTANCE for each', async () => {
    await restartCluster({})
    expect(restart).toBeCalledTimes(3)
    expect(restart).toHaveReturnedWith("101")
    expect(restart).toHaveReturnedWith("102")
    expect(restart).toHaveReturnedWith("103")
  })
  it('passes input obj to .env', async () => {
    expect(process.env.testEnv).toBeUndefined()
    expect(process.env.otherEnv).toBeUndefined()
    await restartCluster({ testEnv: 100, otherEnv: 'test' })
    expect(process.env.testEnv).toBe('100')
    expect(process.env.otherEnv).toBe('test')
  })
})


// MOCKS

jest.mock('../../services/init.services')
jest.mock('../../utils/pm2.promises', () => ({
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  list: jest.fn(() => Promise.resolve([])),
  restart: jest.fn(() => process.env.NODE_APP_INSTANCE),
}))