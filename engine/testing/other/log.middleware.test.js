const logMw = require('../../middleware/log.middleware')

const buildArgs = require('./httpArgs.mock')
jest.mock('morgan', () => (fmt) => 'MORGAN:'+fmt)
jest.mock('../../libs/log', () => ({ log: jest.fn(), http: jest.fn(), verbose: jest.fn() }))
jest.mock('../../config/log.cfg', () => ({
  httpDebug: ['DEBUG'], silent: ['SILENT'], httpMessage: () => ''
}))

describe('loadLogMiddleware', () => {
  const silentArgs = [ , ,jest.fn()]
  const debugArgs = buildArgs()

  it('Silent HTTP Log', () => {
    expect(() => logMw('SILENT')(...silentArgs)).not.toThrow()
    expect(silentArgs[2]).toBeCalledTimes(1)
    expect(silentArgs[2]).toBeCalledWith()
  })
  it('doesn\'t always use silent', () => {
    expect(() => logMw('TEST')(...silentArgs)).toThrow()
  })
  it('Normal HTTP Log', () => {
    expect(logMw('TEST')).toMatch(/^MORGAN/)
    expect(logMw('OTHER')).toMatch(/^MORGAN/)
    expect(logMw('FMT')).toBe('MORGAN:FMT')
  })
  it('Debug HTTP Log', () => {
    expect(() => logMw('DEBUG')(...debugArgs)).not.toThrow()
    expect(jest.isMockFunction(debugArgs[1].end)).toBeFalsy()
    expect(debugArgs[2]).toBeCalledTimes(1)
    expect(debugArgs[2]).toBeCalledWith()
  })
  it('uses env when no httpFmt arg', () => {
    process.env.LOG_HTTP = 'SILENT'
    expect(() => logMw()(...silentArgs)).not.toThrow()
    expect(silentArgs[2]).toBeCalledTimes(1)
    expect(silentArgs[2]).toBeCalledWith()

    process.env.LOG_HTTP = 'TEST'
    expect(logMw()).toMatch(/^MORGAN/)
  })
})

jest.mock('../../utils/http.utils', () => ({
  httpHdr: () => 'HDR:',
  httpRes: () => 'RES',
  httpReq: () => 'REQ',
}))
describe('debugLogger', () => {
  const httpLogger = require('../../libs/log').http
  let args
  beforeEach(() => { args = buildArgs() })

  it('logs http incoming & outgoing', () => {
    expect(httpLogger).toBeCalledTimes(0)
    logMw('DEBUG')(...args)
    expect(httpLogger).toBeCalledTimes(1)
    args[1].end()
    expect(httpLogger).toBeCalledTimes(2)
  })
  it('uses http.utils to format message', () => {
    args[1].end()
    expect(httpLogger).toBeCalledTimes(0)
    
    logMw('DEBUG')(...args)
    args[1].end()
    expect(httpLogger).toHaveBeenNthCalledWith(1, 'HDR:REQ')
    expect(httpLogger).toHaveBeenNthCalledWith(2, 'HDR:RES')
  })
  it('overrides res.end', () => {
    const origEnd = args[1].end
    expect(args[1].end).toBe(origEnd)
    logMw('DEBUG')(...args)
    expect(args[1].end).not.toBe(origEnd)

    expect(origEnd).toBeCalledTimes(0)
    args[1].end()
    expect(origEnd).toBeCalledTimes(1)
  })
})