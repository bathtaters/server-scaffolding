const joinSpy = jest.spyOn(require('path'), 'join')
const { logList, logFile, getLogLevel } = require('../../services/log.services')

jest.mock('fs/promises', () => ({
  readdir: (pass) => Promise.resolve(pass),
  readFile: (pass) => Promise.resolve(pass),
}))
jest.mock('../../utils/log.utils', () => ({
  formatFileLog: (line) => line,
  getMaxEntry: () => ['MAX'],
}))
jest.mock('../../config/log.cfg', () => ({ logViewFileFilter: () => /log/ }))
const joinMock = (...args) => args[args.length - 1]


describe('logList', () => {
  it('filters using logViewFileFilter', () => {
    expect.assertions(1)
    return logList(['logA','logB','skip','logC']).then((res) => 
      expect(res).not.toContain('skip')
    )
  })
  it('reverse-sorts files', () => {
    expect.assertions(1)
    return logList(['logA','logB','logC']).then((res) => 
      expect(res).toEqual(['logC','logB','logA'])
    )
  })
})


describe('logFile', () => {
  it('passes file to log', () => {
    expect.assertions(1)
    joinSpy.mockImplementationOnce(joinMock)
    return logFile('logB', ['logA','logB','logC']).then((res) => 
      expect(res.log).toEqual(['logB'])
    )
  })
  it('gets prev/next files', () => {
    expect.assertions(6)
    joinSpy.mockImplementationOnce(joinMock).mockImplementationOnce(joinMock).mockImplementationOnce(joinMock)
    return Promise.all([
      logFile('logB', ['logA','logB','logC']).then((res) => {
        expect(res).toHaveProperty('prev', 'logA')
        expect(res).toHaveProperty('next', 'logC')
      }),
      logFile('logA', ['logA','logB','logC']).then((res) => {
        expect(res).toHaveProperty('prev', undefined)
        expect(res).toHaveProperty('next', 'logB')
      }),
      logFile('logC', ['logA','logB','logC']).then((res) => {
        expect(res).toHaveProperty('prev', 'logB')
        expect(res).toHaveProperty('next', undefined)
      }),
    ])
  })
})


describe('getLogLevel', () => {
  const options = {
    levels: { a: 1, b: 2, c: 3 },
    testLevel: null,
    silent: ['d','e'],
    httpDebug: ['f','g']
  }

  it('logLevel in levels', () => {
    expect(getLogLevel('a', options, 'a')).toEqual({ level: 'a' })
    expect(getLogLevel('b', options, 'a')).toEqual({ level: 'b' })
    expect(getLogLevel('c', options, 'a')).toEqual({ level: 'c' })
  })
  it('logLevel in silent', () => {
    expect(getLogLevel('d', options, 'a')).toEqual({ silent: true })
    expect(getLogLevel('e', options, 'a')).toEqual({ silent: true })
  })
  it('logLevel in httpDebug', () => {
    expect(getLogLevel('f', options, 'a')).toEqual({ level: 'MAX' })
    expect(getLogLevel('g', options, 'a')).toEqual({ level: 'MAX' })
  })
  it('level is case-insensitive', () => {
    expect(getLogLevel('B', options, 'a')).toEqual({ level: 'b' })
    expect(getLogLevel('G', options, 'a')).toEqual({ level: 'MAX' })
    expect(getLogLevel('D', options, 'a')).toEqual({ silent: true })
  })
  it('test env levels', () => {
    options.testLevel = 't'
    expect(getLogLevel('b', options, 'a', true)).toEqual({ level: 't' })
    expect(getLogLevel('c', options, 'a', false)).toEqual({ silent: true })
    options.testLevel = null
  })
  it('loglevel is missing', () => {
    expect(getLogLevel('q', options, 'a')).toEqual({ level: 'a' })
    expect(getLogLevel('x', options, 'a')).toEqual({ level: 'a' })
  })
  it('loglevel is falsy', () => {
    expect(getLogLevel('',   options, 'a')).toEqual({ level: 'a' })
    expect(getLogLevel(null, options, 'a')).toEqual({ level: 'a' })
  })
  it('falsy loglevel & no default', () => {
    expect(() => getLogLevel('', options, null)).toThrowError()
    expect(() => getLogLevel(false, options, 0)).toThrowError()
  })
})