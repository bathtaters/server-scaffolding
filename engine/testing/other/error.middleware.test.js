const logSpy = jest.spyOn(require('../../libs/log'),'error')

const { json, html } = require('../../middleware/error.middleware')
const buildArgs = require('./httpArgs.mock')
const errors = require('../../config/errors.engine')

const [ catchMissing, normalizeError, sendAsJSON ] = json, sendAsHTML = html[2]
const defaultError = errors.unknown(), error404 = errors.missing()

describe('catchMissing', () => {
 const args = buildArgs()
 beforeEach(() => { args[0].error = 'TESTERR' })
 
 it('passes error to next', () => {
  catchMissing(...args)
  expect(args[2]).toBeCalledTimes(1)
  expect(args[2]).toBeCalledWith(expect.anything())
 })
 it('uses existing error', () => {
  catchMissing(...args)
  expect(args[2]).toBeCalledTimes(1)
  expect(args[2]).toBeCalledWith('TESTERR')
 })
 it('uses 404 error if no error', () => {
  args[0].error = null
  catchMissing(...args)
  expect(args[2]).toBeCalledTimes(1)
  expect(args[2]).toBeCalledWith(error404)
 })
})

describe('normalizeError', () => {
  const args = buildArgs()
  beforeEach(() => {
    logSpy.mockImplementationOnce(() => {})
    args[0].error = { name: 'NAME', message: 'MESSAGE', status: 'STATUS', stack: 'STACK' }
  })

  it('calls next()', () => {
    normalizeError(null, ...args)
    expect(args[2]).toBeCalledWith()
   })
  it('uses passed in error first', () => {
    normalizeError({ message: 'OVERRIDE' }, ...args)
    expect(args[0].error).toHaveProperty('message', 'OVERRIDE')
   })
  it('uses req.error second', () => {
    normalizeError(null, ...args)
    expect(args[0].error).toHaveProperty('message', 'MESSAGE')
   })
  it('uses default error third', () => {
    args[0].error = null
    normalizeError(null, ...args)
    expect(args[0].error).toEqual(defaultError)
   })
  it('moves error string into message', () => {
    normalizeError('TESTERR', ...args)
    expect(args[0].error).toHaveProperty('message', 'TESTERR')
   })
  it('uses default error.arg when missing', () => {
    normalizeError({ error: true }, ...args)
    expect(args[0].error).toHaveProperty('name', defaultError.name)
    expect(args[0].error).toHaveProperty('message', defaultError.message)
    expect(args[0].error).toHaveProperty('status', defaultError.status)
   })
  it('gets missing error name from statusCode', () => {
    normalizeError({ status: 418 }, ...args)
    expect(args[0].error).toHaveProperty('name', 'ImATeapotError')
   })
  it('logs error stack when present', () => {
    normalizeError(null, ...args)
    expect(logSpy).toBeCalledTimes(1)
    expect(logSpy).toBeCalledWith(expect.stringContaining('STACK'))
  })
  it('logs generated message when no stack', () => {
    args[0].error.stack = null
    normalizeError(null, ...args)
    expect(logSpy).toBeCalledTimes(1)
    expect(logSpy).toBeCalledWith(expect.stringContaining('NAME'))
    expect(logSpy).toBeCalledWith(expect.stringContaining('STATUS'))
    expect(logSpy).toBeCalledWith(expect.stringContaining('MESSAGE'))
  })
  it('sets res statusCode', () => {
    normalizeError(null, ...args)
    expect(args[1].status).toBeCalledTimes(1)
    expect(args[1].status).toBeCalledWith('STATUS')
  })
})

describe('sendAsJSON', () => {
  const args = buildArgs()
  beforeEach(() => { args[0].error = 'TESTERR' })

  it('sends object', () => {
    sendAsJSON(...args)
    expect(args[1].send).toBeCalledTimes(1)
    expect(args[1].send).toBeCalledWith(expect.any(Object))
  })
  it('does not call next', () => {
    sendAsJSON(...args)
    expect(args[2]).not.toBeCalled()
  })
  it('object contains error', () => {
    sendAsJSON(...args)
    expect(args[1].send).toBeCalledWith(expect.objectContaining({ error: 'TESTERR' }))
  })
})

jest.mock('../../utils/users.utils', () => ({ hasAccess: (acc) => 'has:'+acc }))
jest.mock('../../utils/gui.utils', () => ({ varName: () => 'TITLE' }))
describe('sendAsHTML', () => {
  const args = buildArgs({ user: { username: 'USER', access: 'ACCESS' } })
  beforeEach(() => { args[0].error = 'TESTERR' })

  it('renders page', () => {
    sendAsHTML(...args)
    expect(args[1].render).toBeCalledTimes(1)
  })
  it('does not call next', () => {
    sendAsHTML(...args)
    expect(args[2]).not.toBeCalled()
  })
  it('render call contains error', () => {
    sendAsHTML(...args)
    expect(args[1].render).toBeCalledWith(
      expect.any(String),
      expect.objectContaining({ error: 'TESTERR' })
    )
  })
  it('render call contains user details', () => {
    sendAsHTML(...args)
    expect(args[1].render).toBeCalledWith(
      expect.any(String),
      expect.objectContaining({
        user: 'USER',
        isAdmin: 'has:ACCESS',
      })
    )
  })
})