const { Update, Undo, Default, Restart } = require('../../services/settings.form')
const { setEnv, canUndo } = require('../../services/settings.services')
const { deepUnescape } = require('../../utils/validate.utils')
const errors = require('../../config/errors.internal')

describe('settingsActions', () => {

  describe('Update', () => {
    it('uses setEnv', async () => {
      await Update({ test: 'new' }, 'session')
      expect(setEnv).toBeCalledTimes(1)
      expect(setEnv).toBeCalledWith({ test: 'new' }, expect.anything())
    })
    it('passes session to setEnv', async () => {
      await Update({ test: 'new' }, 'session')
      expect(setEnv).toBeCalledTimes(1)
      expect(setEnv).toBeCalledWith(expect.anything(), 'session')
    })
    it('unescapes input', async () => {
      await Update({ test: 'new' }, 'session')
      expect(deepUnescape).toBeCalledTimes(1)
      expect(deepUnescape).toBeCalledWith({ test: 'new' })
    })
  })


  describe('Undo', () => {
    let undoSettings = []
    beforeEach(() => { undoSettings = [{ test: '0' }, { test: '1' }] })

    it('does not pass session to setEnv', async () => {
      await Undo({}, { undoSettings })
      expect(setEnv).toBeCalledTimes(1)
      expect(setEnv).toBeCalledWith(expect.anything())
    })
    it('sets as last queue value', async () => {  
      await Undo({}, { undoSettings })
      expect(setEnv).toHaveBeenNthCalledWith(1, { test: '1' })
      await Undo({}, { undoSettings })
      expect(setEnv).toHaveBeenNthCalledWith(2, { test: '0' })
    })
    it('shrinks undo queue', async () => {
      expect(undoSettings).toHaveLength(2)
      await Undo({}, { undoSettings })
      expect(undoSettings).toHaveLength(1)
      await Undo({}, { undoSettings })
      expect(undoSettings).toHaveLength(0)
    })
    it('does not unescape input', async () => {
      await Undo({}, { undoSettings })
      expect(deepUnescape).toBeCalledTimes(0)
    })
    it('throws error when canUndo returns false', async () => {
      expect.assertions(1)
      canUndo.mockReturnValueOnce(false)
      await Undo({},{ undoSettings }).catch((err) => expect(err).toEqual(errors.noUndo()))
    })
  })


  describe('Default', () => {
    it('uses setEnv', async () => {
      await Default({}, 'session')
      expect(setEnv).toBeCalledTimes(1)
      expect(setEnv).toBeCalledWith({ test: 'default' }, expect.anything())
    })
    it('passes session to setEnv', async () => {
      await Default({}, 'session')
      expect(setEnv).toBeCalledTimes(1)
      expect(setEnv).toBeCalledWith(expect.anything(), 'session')
    })
    it('does not unescape input', async () => {
      await Default({}, 'session')
      expect(deepUnescape).toBeCalledTimes(0)
    })
  })


  describe('Restart', () => {
    const { status } = errors.test()

    it('throws error in test env', async () => {
      expect.assertions(6)  
      await Restart().catch((err) => {
        expect(err).toHaveProperty('stack')
        expect(err).toHaveProperty('status', status)
        expect(err).toHaveProperty('message', expect.stringContaining('test'))
      })
      await Restart({ test: 'new' }).catch((err) => {
        expect(err).toHaveProperty('stack')
        expect(err).toHaveProperty('status', status)
        expect(err).toHaveProperty('message', expect.stringContaining('test'))
      })
    })
    it('uses setEnv', async () => {
      await Restart({ test: 'new' }, 'session')
        .catch((err) => { if (err.status !== status) throw err })
      expect(setEnv).toBeCalledTimes(1)
      expect(setEnv).toBeCalledWith({ test: 'new' }, expect.anything())
    })
    it('skips setEnv if no input', async () => {
      await Restart().catch((err) => { if (err.status !== status) throw err })
      expect(setEnv).toBeCalledTimes(0)
    })
    it('passes session to setEnv', async () => {
      await Restart({ test: 'new' }, 'session')
        .catch((err) => { if (err.status !== status) throw err })
      expect(setEnv).toBeCalledTimes(1)
      expect(setEnv).toBeCalledWith(expect.anything(), 'session')
    })
    it('unescapes input', async () => {
      await Restart({ test: 'new' }, 'session')
        .catch((err) => { if (err.status !== status) throw err })
      expect(deepUnescape).toBeCalledTimes(1)
      expect(deepUnescape).toBeCalledWith({ test: 'new' })
    })
  })
})



// MOCKS

jest.mock('../../services/settings.services', () => ({
  envDefaults: { test: 'default' },
  getEnv: jest.fn(() => Promise.resolve({})),
  setEnv: jest.fn(() => Promise.resolve()),
  canUndo: jest.fn(() => true),
}))

jest.mock('../../utils/validate.utils', () => ({ deepUnescape: jest.fn((obj) => obj) }))
jest.mock('../../services/pm2.services', () => ({}))
jest.mock('../../../config/meta', () => ({}))