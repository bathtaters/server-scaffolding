const { getEnv, canUndo, getForm, settingsActions } = require('../../services/settings.services')
const { filterOutProps } = require('../../utils/settings.utils')

jest.mock('fs/promises', () => ({ writeFile: () => Promise.resolve() }))
jest.mock('../../utils/settings.utils', () => ({
  getEnvVars: () => ({ a: 1, b: 2, c: 3 }),
  stringifyEnv: () => {},
  filterOutProps: jest.fn((obj, props) => { process.testProps = props; return obj }),
}))
jest.mock('../../config/env.cfg', () => ({
  updateRootPath: () => {},
  defaults: { a: 12345, DB_DIR: '', LOG_DIR: '' },
  formSettings: {
    a: { type: 'number'               },
    b: { type: [1,3] , readonly: true },
    c: { type: 'text', readonly: true },
  }
}))

describe('initialize settings.services', () => {
  afterAll(() => { delete process.testProps })

  it('filters out readonly props', () => {
    expect(process.testProps).toEqual(['b','c'])
  })
})

describe('getEnv/canUndo', () => {
  it('gets initial env val', () => {
    expect(getEnv()).toEqual({ a: 1, b: 2, c: 3 })
  })
  it('cannot undo initially', () => {
    expect(canUndo()).toBeFalsy()
  })
})

describe('getForm', () => {
  const form = getForm() 
  it('gets all envVars', () => {
    expect(form.flatMap(Object.keys)).toEqual(['a','b','c'])
  })
  it('splits in half', () => {
    expect(form.map(Object.keys)).toEqual([['a','b'],['c']])
  })
  it('appends currentVal to array', () => {
    expect(form[0].b.type).toEqual([1,3,'2'])
  })
})
const undoErr = require('../../config/errors.internal').noUndo
describe('settingsActions', () => {
  const { Update, Undo, Default, Restart } = settingsActions

  it('Update adds to queue', () => {
    expect.assertions(2)
    // + 1 to queue
    return Update({ a: 2, b: 4, c: 6 }).then(() => {
      expect(getEnv()).toEqual({ a: 2, b: 4, c: 6 })
      expect(canUndo()).toBeTruthy()
      // - 1 from queue
      return Undo()
    })
  })

  it('Update does not change missing props', () => {
    expect.assertions(1)
    // + 1 to queue
    return Update({ b: 4 }).then(() => {
      expect(getEnv()).toEqual({ a: 1, b: 4, c: 3 })
      // - 1 from queue
      return Undo()
    })
  })

  it('Undo removes from queue', () => {
    expect.assertions(3)
    // + 1 to queue // - 1 from queue
    return Update({ a: 2, b: 4, c: 6 }).then(() => Undo().then(() => {
      expect(getEnv()).toEqual({ a: 1, b: 2, c: 3 })
      expect(canUndo()).toBeFalsy()
      expect(() => Undo()).toThrowError(undoErr())
    }))
  })

  it('Default adds to queue', () => {
    expect.assertions(2)
    // + 1 to queue
    return Default().then(() => {
      expect(getEnv()).toHaveProperty('a', 12345)
      expect(canUndo()).toBeTruthy()
      // - 1 from queue
      return Undo()
    })
  })

  it('Restart adds to queue (if passed arg)', () => {
    expect.assertions(3)
    // + 1 to queue
    return Restart({ a: 2, b: 4, c: 6 }).then((res) => {
      expect(res).toBe('RESTART')
      expect(getEnv()).toEqual({ a: 2, b: 4, c: 6 })
      expect(canUndo()).toBeTruthy()
      // - 1 from queue
      return Undo()
    })
  })

  it('Restart skips add to queue (if no arg)', () => {
    expect.assertions(3)
    return Restart().then((res) => {
      expect(res).toBe('RESTART')
      expect(getEnv()).toEqual({ a: 1, b: 2, c: 3 })
      expect(canUndo()).toBeFalsy()
    })

  })
})