const { Update, Undo, Default, Restart } = require('../../services/settings.form')
const { setSettings, canUndo } = require('../../services/settings.services')
const errors = require('../../config/errors.engine')

describe('settingsActions', () => {

  describe('Update', () => {
    it('uses setSettings', async () => {
      await Update({ test: 'new' }, 'session')
      expect(setSettings).toBeCalledTimes(1)
      expect(setSettings).toBeCalledWith({ test: 'new' }, expect.anything())
    })
    it('passes session to setSettings', async () => {
      await Update({ test: 'new' }, 'session')
      expect(setSettings).toBeCalledTimes(1)
      expect(setSettings).toBeCalledWith(expect.anything(), 'session')
    })
  })


  describe('Undo', () => {
    let undoSettings = []
    beforeEach(() => { undoSettings = [{ test: '0' }, { test: '1' }] })

    it('does not pass session to setSettings', async () => {
      await Undo({}, { undoSettings })
      expect(setSettings).toBeCalledTimes(1)
      expect(setSettings).toBeCalledWith(expect.anything())
    })
    it('sets as last queue value', async () => {  
      await Undo({}, { undoSettings })
      expect(setSettings).toHaveBeenNthCalledWith(1, { test: '1' })
      await Undo({}, { undoSettings })
      expect(setSettings).toHaveBeenNthCalledWith(2, { test: '0' })
    })
    it('shrinks undo queue', async () => {
      expect(undoSettings).toHaveLength(2)
      await Undo({}, { undoSettings })
      expect(undoSettings).toHaveLength(1)
      await Undo({}, { undoSettings })
      expect(undoSettings).toHaveLength(0)
    })
    it('throws error when canUndo returns false', async () => {
      expect.assertions(1)
      canUndo.mockReturnValueOnce(false)
      await Undo({},{ undoSettings }).catch((err) => expect(err).toEqual(errors.noUndo()))
    })
  })


  describe('Default', () => {
    it('uses setSettings', async () => {
      await Default({}, 'session')
      expect(setSettings).toBeCalledTimes(1)
      expect(setSettings).toBeCalledWith({ test: 'default' }, expect.anything())
    })
    it('passes session to setSettings', async () => {
      await Default({}, 'session')
      expect(setSettings).toBeCalledTimes(1)
      expect(setSettings).toBeCalledWith(expect.anything(), 'session')
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
    it('uses setSettings', async () => {
      await Restart({ test: 'new' }, 'session')
        .catch((err) => { if (err.status !== status) throw err })
      expect(setSettings).toBeCalledTimes(1)
      expect(setSettings).toBeCalledWith({ test: 'new' }, expect.anything())
    })
    it('skips setSettings if no input', async () => {
      await Restart().catch((err) => { if (err.status !== status) throw err })
      expect(setSettings).toBeCalledTimes(0)
    })
    it('passes session to setSettings', async () => {
      await Restart({ test: 'new' }, 'session')
        .catch((err) => { if (err.status !== status) throw err })
      expect(setSettings).toBeCalledTimes(1)
      expect(setSettings).toBeCalledWith(expect.anything(), 'session')
    })
  })
})



// MOCKS

jest.mock('child_process', () => ({}))
jest.mock('../../services/pm2.services', () => ({}))
jest.mock('../../config/meta', () => ({}))
jest.mock('../../services/settings.services', () => ({
  settingsDefaults: { test: 'default' },
  getSettings: jest.fn(() => Promise.resolve({})),
  setSettings: jest.fn(() => Promise.resolve()),
  canUndo: jest.fn(() => true),
}))