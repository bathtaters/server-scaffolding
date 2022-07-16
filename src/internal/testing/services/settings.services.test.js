const { getEnv, canUndo, getForm, settingsActions } = require('../../services/settings.services')
const { writeFile } = require('fs/promises')
const { expectEnvWrite } = require('../test.utils')
const errors = require('../../config/errors.internal')

describe('initialize settings.services', () => {
  afterAll(() => { delete process.testProps })

  it('filters out readonly props', () => {
    expect(process.testProps).toEqual(['b','c'])
  })
})

describe('getEnv/canUndo', () => {
  it('gets initial env val', async () => {
    expect(await getEnv()).toEqual({ a: 1, b: 2, c: 3 })
  })
  it('cannot undo initially', () => {
    expect(canUndo()).toBeFalsy()
  })
})

describe('getForm', () => {
  let form
  beforeAll(() => getForm().then((f) => form = f))

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

describe('settingsActions', () => {
  const { Update, Undo, Default, Restart } = settingsActions

  it('Update adds to queue', async () => {
    await Update({ a: 2, b: 4, c: 6 })
    expect(writeFile).toBeCalledTimes(1)
    expect(writeFile).toBeCalledWith(expect.any(String), { a: 2, b: 4, c: 6 })
    // expect(canUndo()).toBeTruthy()
    // await Undo()
  })

  it('Update does not change missing props', async () => {
    await Update({ b: 4 })
    expect(writeFile).toBeCalledTimes(1)
    expect(writeFile).toBeCalledWith(expect.any(String), { a: 1, b: 4, c: 3 })
    // await Undo()
  })

  it.todo('Test UNDO')
  // it('Undo removes from queue', async () => {
  //   await Update({ a: 2, b: 4, c: 6 })
  //   await Undo()
  //   expect(writeFile).toBeCalledTimes(2)
  //   expect(writeFile).toHaveBeenNthCalledWith(2, expect.any(String), { a: 1, b: 2, c: 3 })
  //   expect(canUndo()).toBeFalsy()
  //   await expect(() => Undo()).rejects.toEqual(errors.noUndo())
  // })

  it('Default adds to queue', async () => {
    await Default()
    expect(writeFile).toBeCalledTimes(1)
    expect(writeFile).toBeCalledWith(expect.any(String), expect.objectContaining({ a: 12345 }))
    // expect(canUndo()).toBeTruthy()
    // await Undo()
  })

  it('Restart throws error in test env', async () => {
    await Restart().catch((err) => {
      expect(err).toHaveProperty('stack')
      expect(err).toHaveProperty('status', 418)
    })
    await Restart({ a: 2, b: 4, c: 6 }).catch((err) => {
      expect(err).toHaveProperty('stack')
      expect(err).toHaveProperty('status', 418)
    })
    // expect(canUndo()).toBeTruthy()
    // await Undo()
  })

  it('Restart adds to queue (if passed arg)', async () => {
    await Restart({ a: 2, b: 4, c: 6 }).catch(() => {})
    expect(writeFile).toBeCalledTimes(1)
    expect(writeFile).toBeCalledWith(expect.any(String), { a: 2, b: 4, c: 6 })
    // expect(canUndo()).toBeTruthy()
    // await Undo()
  })

  it('Restart skips add to queue (if no arg)', async () => {
    await Restart().catch(() => {})
    expect(writeFile).toBeCalledTimes(0)
    expect(canUndo()).toBeFalsy()
  })
})


// MOCKS

jest.mock('fs/promises', () => ({ writeFile: jest.fn(() => Promise.resolve()), readFile: () => Promise.resolve('') }))
jest.mock('../../utils/settings.utils', () => ({
  getEnvVars: () => ({ a: 1, b: 2, c: 3 }),
  stringifyEnv: (obj) => obj,
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