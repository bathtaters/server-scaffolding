import logMw from '../../middleware/log.middleware'
import logger from '../../libs/log'
import { httpLog } from '../../types/log'
import buildArgs from '../httpArgs.mock'

describe('loadLogMiddleware', () => {
  let mwArgs: ReturnType<typeof buildArgs>
  beforeEach(() => { mwArgs = buildArgs() })

  it('Silent HTTP Log', () => {
    expect(() => logMw('SILENT')(...mwArgs)).not.toThrow()
    expect(mwArgs[2]).toBeCalledTimes(1)
    expect(mwArgs[2]).toBeCalledWith()
  })
  it('doesn\'t always use silent', () => {
    expect(() => logMw('TEST')(...mwArgs)).toThrow()
  })
  it('Normal HTTP Log', () => {
    expect(logMw(httpLog.dev)).toMatch(/^MORGAN/)
    expect(logMw(httpLog.tiny)).toBe('MORGAN:'+httpLog.tiny)
    expect(logMw(httpLog.combined)).toBe('MORGAN:'+httpLog.combined)
  })
  it('Debug HTTP Log', () => {
    expect(() => logMw('DEBUG')(...mwArgs)).not.toThrow()
    expect(jest.isMockFunction(mwArgs[1].end)).toBeFalsy()
    expect(mwArgs[2]).toBeCalledTimes(1)
    expect(mwArgs[2]).toBeCalledWith()
  })
  it('uses env when no httpFmt arg', () => {
    process.env.LOG_HTTP = 'SILENT'
    expect(() => logMw()(...mwArgs)).not.toThrow()
    expect(mwArgs[2]).toBeCalledTimes(1)
    expect(mwArgs[2]).toBeCalledWith()

    process.env.LOG_HTTP = httpLog.common
    expect(logMw()).toBe('MORGAN:'+httpLog.common)
  })
})


describe('debugLogger', () => {
  let mwArgs: ReturnType<typeof buildArgs>
  beforeEach(() => { mwArgs = buildArgs() })

  it('logs http incoming & outgoing', () => {
    expect(logger.http).toBeCalledTimes(0)
    logMw('DEBUG')(...mwArgs)
    expect(logger.http).toBeCalledTimes(1)
    mwArgs[1].end()
    expect(logger.http).toBeCalledTimes(2)
  })
  it('uses http.utils to format message', () => {
    mwArgs[1].end()
    expect(logger.http).toBeCalledTimes(0)
    
    logMw('DEBUG')(...mwArgs)
    mwArgs[1].end()
    expect(logger.http).toHaveBeenNthCalledWith(1, 'HDR:REQ')
    expect(logger.http).toHaveBeenNthCalledWith(2, 'HDR:RES')
  })
  it('overrides res.end', () => {
    const origEnd = mwArgs[1].end
    expect(mwArgs[1].end).toBe(origEnd)
    logMw('DEBUG')(...mwArgs)
    expect(mwArgs[1].end).not.toBe(origEnd)

    expect(origEnd).toBeCalledTimes(0)
    mwArgs[1].end()
    expect(origEnd).toBeCalledTimes(1)
  })
})


// MOCKS
jest.mock('morgan', () => (fmt: string) => 'MORGAN:'+fmt)

jest.mock('../../libs/log', () => ({
  ...jest.requireActual('../../libs/log'),
  log:     jest.fn(),
  http:    jest.fn(),
  verbose: jest.fn()
}))

jest.mock('../../config/log.cfg', () => ({
  ...jest.requireActual('../../config/log.cfg'),
  httpDebug:   ['DEBUG'],
  silent:      ['SILENT'],
  httpMessage: () => ''
}))

jest.mock('../../utils/http.utils', () => ({
  httpHdr: () => 'HDR:',
  httpRes: () => 'RES',
  httpReq: () => 'REQ',
}))