import logger from '../../libs/log'
import createHttpError from 'http-errors'
import { Role } from '../../types/Users'
import { unknown, missing, noCSRF as _noCSRF, noSession } from '../../config/errors.engine'
import { jsonError, htmlError } from '../../middleware/error.middleware'
import buildArgs from '../httpArgs.mock'


const [ catchMissing, normalizeError, sendAsJSON ] = jsonError
  , sendAsHTML = htmlError[2]

const noCSRF = createHttpError({ code: 'EBADCSRFTOKEN' })
const errors = {
  default: unknown(),
  404:     missing(),
  csrf:    _noCSRF(),
  session: noSession(),
  test: createHttpError('TESTERR'),
}


describe('catchMissing', () => {
 const args = buildArgs()
 beforeEach(() => { args[0].error = errors.test })
 
 it('passes error to next', () => {
  catchMissing(...args)
  expect(args[2]).toBeCalledTimes(1)
  expect(args[2]).toBeCalledWith(expect.anything())
 })
 it('uses existing error', () => {
  catchMissing(...args)
  expect(args[2]).toBeCalledTimes(1)
  expect(args[2]).toBeCalledWith(errors.test)
 })
 it('uses 404 error if no error', () => {
  args[0].error = undefined
  catchMissing(...args)
  expect(args[2]).toBeCalledTimes(1)
  expect(args[2]).toBeCalledWith(errors[404])
 })
})


describe('normalizeError', () => {
  const args = buildArgs()
  beforeEach(() => {
    (logger.error as ReturnType<typeof jest.fn>).mockImplementationOnce(() => {})
    args[0].error = createHttpError(418, { name: 'NAME', message: 'MESSAGE', stack: 'STACK' })
  })

  it('calls next()', () => {
    normalizeError(undefined, ...args)
    expect(args[2]).toBeCalledWith()
   })
  it('uses passed in error first', () => {
    normalizeError(createHttpError('OVERRIDE'), ...args)
    expect(args[0].error).toHaveProperty('message', 'OVERRIDE')
   })
  it('uses req.error second', () => {
    normalizeError(undefined, ...args)
    expect(args[0].error).toHaveProperty('message', 'MESSAGE')
   })
  it('uses default error third', () => {
    args[0].error = undefined
    normalizeError(undefined, ...args)
    expect(args[0].error).toEqual(errors.default)
   })
  it('moves error string into message', () => {
    normalizeError('TESTERR', ...args)
    expect(args[0].error).toHaveProperty('message', 'TESTERR')
   })
  it('uses default error.arg when missing', () => {
    normalizeError(createHttpError(''), ...args)
    expect(args[0].error).toHaveProperty('name',    errors.default.name)
    expect(args[0].error).toHaveProperty('message', errors.default.message)
    expect(args[0].error).toHaveProperty('status',  errors.default.status)
   })
  it('gets missing error name from statusCode', () => {
    normalizeError(createHttpError(418), ...args)
    expect(args[0].error).toHaveProperty('name', 'ImATeapotError')
   })
  it('logs error stack when present', () => {
    normalizeError(undefined, ...args)
    expect(logger.error).toBeCalledTimes(1)
    expect(logger.error).toBeCalledWith(expect.stringContaining('STACK'))
  })
  it('logs generated message when no stack', () => {
    delete args[0].error?.stack
    normalizeError(undefined, ...args)
    expect(logger.error).toBeCalledTimes(1)
    expect(logger.error).toBeCalledWith(expect.stringContaining('NAME'))
    expect(logger.error).toBeCalledWith(expect.stringContaining('418'))
    expect(logger.error).toBeCalledWith(expect.stringContaining('MESSAGE'))
  })
  it('sets res statusCode', () => {
    normalizeError(undefined, ...args)
    expect(args[1].status).toBeCalledTimes(1)
    expect(args[1].status).toBeCalledWith(418)
  })
  it('missing session error', () => {
    normalizeError(noCSRF, ...args)
    expect(args[0].error).toEqual(errors.session)
  })
  it('missing CSRF error', () => {
    const sessionArgs = buildArgs({ session: {} as any })
    normalizeError(noCSRF, ...sessionArgs)
    expect(sessionArgs[0].error).toEqual(errors.csrf)
  })
})


describe('sendAsJSON', () => {
  const args = buildArgs()
  beforeEach(() => { args[0].error = errors.test })

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
    expect(args[1].send).toBeCalledWith(expect.objectContaining({ error: errors.test }))
  })
})


describe('sendAsHTML', () => {
  const args = buildArgs({ user: { username: 'USER', role: new Role('api','gui'), locked: false } })
  beforeEach(() => { args[0].error = errors.test })

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
      expect.objectContaining({ error: errors.test })
    )
  })
  it('render call contains user details', () => {
    sendAsHTML(...args)
    expect(args[1].render).toBeCalledWith(
      expect.any(String),
      expect.objectContaining({
        user: 'USER',
        isAdmin: false,
      })
    )
  })
})


// MOCKS
jest.mock('../../libs/log', () => ({
  ...jest.requireActual('../../libs/log'),
  error: jest.fn(jest.requireActual('../../libs/log').error)
}))
jest.mock('../../utils/gui.utils',   () => ({ varName:   () => 'TITLE' }))