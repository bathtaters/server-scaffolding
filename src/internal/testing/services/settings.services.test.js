const { getEnv, canUndo, getForm, settingsActions } = require('../../services/settings.services')
const { writeFile } = require('fs/promises')
const { getChanged, getEnvVars } = require('../../utils/settings.utils')
const { deepUnescape } = require('../../utils/validate.utils')
const errors = require('../../config/errors.internal')

describe('initialize settings.services', () => {
  afterAll(() => { delete process.testProps })

  it('filters out readonly props from defaults', () => {
    expect(process.testProps).toEqual(['env', 'other'])
  })
})

describe('getEnv/canUndo', () => {
  it('gets initial env val', async () => {
    getEnvVars.mockResolvedValueOnce({ test: 'val' })
    expect(await getEnv()).toEqual({ test: 'val' })
  })
  it('cannot undo initially', () => {
    expect(canUndo()).toBeFalsy()
  })
})

describe('getForm', () => {
  let form
  beforeAll(async () => {
    getEnvVars.mockResolvedValueOnce({ test: 1, env: 2, other: 3 })
    form = await getForm()
  })

  it('gets all envVars', () => {
    expect(form.flatMap(Object.keys)).toEqual(['test','env','other'])
  })
  it('splits in half', () => {
    expect(form.map(Object.keys)).toEqual([['test','env'],['other']])
  })
  it('appends currentVal to array', () => {
    expect(form[0].env.type).toEqual([1,3,'2'])
  })
})

describe('settingsActions', () => {
  const { Update, Undo, Default, Restart } = settingsActions

  beforeEach(() => { getEnvVars.mockResolvedValueOnce({ test: 'val' }) })

  describe('Update', () => {
    it('Update writes new settings', async () => {
      await Update({ test: 'new' })
      expect(writeFile).toBeCalledTimes(1)
      expect(writeFile).toBeCalledWith(expect.any(String), { test: 'new' })
    })
  
    it('Update does not change missing props', async () => {
      await Update({ other: 'new' })
      expect(writeFile).toBeCalledTimes(1)
      expect(writeFile).toBeCalledWith(expect.any(String), { test: 'val', other: 'new' })
    })
  
    it('Update adds to undo queue in session', async () => {
      const session = {}
      await Update({ test: '1' }, session)
      getEnvVars.mockResolvedValueOnce({ test: '1' })
      expect(session).toHaveProperty('undoSettings', expect.any(Array))
      expect(session.undoSettings).toHaveLength(1)
  
      await Update({ test: '2' }, session)
      expect(session.undoSettings).toHaveLength(2)
    })

    it('Update unescapes input', async () => {
      await Update({ test: 'new' })
      expect(deepUnescape).toBeCalledTimes(1)
      expect(deepUnescape).toBeCalledWith({ test: 'new' })
    })

    it('Update checks for changes', async () => {
      await Update({ other: 'new' }, {})
      expect(getChanged).toBeCalledTimes(1)
      expect(getChanged).toBeCalledWith({ test: 'val' }, { other: 'new' })
    })
  
    it('Update skips write when no changes', async () => {
      getChanged.mockReturnValueOnce({})
      await Update({ other: 'new' }, {}) // needs Session {}
      expect(writeFile).toBeCalledTimes(0)
    })
  })

  describe('Default', () => {
    const defaultObj = expect.objectContaining({ test: 'default', env: 1, other: false })

    it('Default writes default settings', async () => {
      await Default()
      expect(writeFile).toBeCalledTimes(1)
      expect(writeFile).toBeCalledWith(expect.any(String), defaultObj)
    })

    it('Default does not change missing props', async () => {
      await getEnvVars() // clear default mock
      getEnvVars.mockResolvedValueOnce({ missing: 'prop' })

      await Default({})
      expect(writeFile).toBeCalledTimes(1)
      expect(writeFile).toBeCalledWith(
        expect.any(String), expect.objectContaining({ missing: 'prop' })
      )
    })
  
    it('Default adds to undo queue in session', async () => {
      const session = {}
      await Default({}, session)
      getEnvVars.mockResolvedValueOnce({ test: '1' })
      expect(session).toHaveProperty('undoSettings', expect.any(Array))
      expect(session.undoSettings).toHaveLength(1)
  
      await Default({}, session)
      expect(session.undoSettings).toHaveLength(2)
    })

    it('Default does not unescape input', async () => {
      await Default({})
      expect(deepUnescape).toBeCalledTimes(0)
    })

    it('Default checks for changes', async () => {
      await Default({}, {}) // needs Session {}
      expect(getChanged).toBeCalledTimes(1)
      expect(getChanged).toBeCalledWith({ test: 'val' }, defaultObj)
    })
  
    it('Default skips write when no changes', async () => {
      getChanged.mockReturnValueOnce({})
      await Default({ other: 'new' }, {}) // needs Session {}
      expect(writeFile).toBeCalledTimes(0)
    })
  })


  describe('Restart', () => {
    it('Restart throws error in test env', async () => {
      await Restart().catch((err) => {
        expect(err).toHaveProperty('stack')
        expect(err).toHaveProperty('status', 418)
        expect(err).toHaveProperty('message', expect.stringContaining('test'))
      })
      await Restart({ test: 'new' }).catch((err) => {
        expect(err).toHaveProperty('stack')
        expect(err).toHaveProperty('status', 418)
        expect(err).toHaveProperty('message', expect.stringContaining('test'))
      })
    })

    it('Restart w/ input writes update', async () => {
      await Restart({ test: 'new' }).catch(() => {})
      expect(writeFile).toBeCalledTimes(1)
      expect(writeFile).toBeCalledWith(expect.any(String), { test: 'new' })
    })

    it('Restart skips writing if no input', async () => {
      await Restart().catch(() => {})
      expect(writeFile).toBeCalledTimes(0)
      expect(canUndo()).toBeFalsy()
      await getEnvVars() // clear unused mock
    })

    it('Restart w/ input does not change missing props', async () => {
      await Restart({ other: 'new' }).catch(() => {})
      expect(writeFile).toBeCalledTimes(1)
      expect(writeFile).toBeCalledWith(
        expect.any(String), { test: 'val', other: 'new' }
      )
    })
  
    it('Restart w/ input adds to undo queue in session', async () => {
      const session = {}
      await Restart({ test: '1' }, session).catch(() => {})
      getEnvVars.mockResolvedValueOnce({ test: '1' })
      expect(session).toHaveProperty('undoSettings', expect.any(Array))
      expect(session.undoSettings).toHaveLength(1)
  
      await Restart({ test: '2' }, session).catch(() => {})
      expect(session.undoSettings).toHaveLength(2)
    })

    it('Restart unescapes input', async () => {
      await Restart({ test: 'new' }).catch(() => {})
      expect(deepUnescape).toBeCalledTimes(1)
      expect(deepUnescape).toBeCalledWith({ test: 'new' })
    })

    it('Restart w/ input checks for changes', async () => {
      await Restart({ other: 'new' }, {}).catch(() => {}) // needs Session {}
      expect(getChanged).toBeCalledTimes(1)
      expect(getChanged).toBeCalledWith({ test: 'val' }, { other: 'new' })
    })
  
    it('Restart w/ input skips write when no changes', async () => {
      getChanged.mockReturnValueOnce({})
      await Restart({ other: 'new' }, {}).catch(() => {}) // needs Session {}
      expect(writeFile).toBeCalledTimes(0)
    })
  })


  describe('Undo', () => {
    let undoSettings = []
    beforeEach(() => { undoSettings = [{ test: '0' }, { test: '1' }] })

    it('Undo writes last queue value', async () => {  
      await Undo({}, { undoSettings })
      expect(writeFile).toHaveBeenNthCalledWith(1,
        expect.any(String), { test: '1' }
      )
      await Undo({}, { undoSettings })
      expect(writeFile).toHaveBeenNthCalledWith(2,
        expect.any(String), { test: '0' }
      )
    })
  
    it('Undo does not change missing props', async () => {
      await getEnvVars() // clear default mock
      getEnvVars.mockResolvedValueOnce({ missing: 'prop' })

      await Undo({}, { undoSettings })
      expect(writeFile).toBeCalledTimes(1)
      expect(writeFile).toBeCalledWith(
        expect.any(String), { test: '1', missing: 'prop' }
      )
    })
  
    it('Undo shrinks undo queue', async () => {
      expect(undoSettings).toHaveLength(2)
      await Undo({}, { undoSettings })
      expect(undoSettings).toHaveLength(1)
      await Undo({}, { undoSettings })
      expect(undoSettings).toHaveLength(0)
    })

    it('Undo does not unescape input', async () => {
      await Undo({}, { undoSettings })
      expect(deepUnescape).toBeCalledTimes(0)
    })

    it('Undo skips check for changes', async () => {
      await Undo({}, { undoSettings })
      expect(getChanged).toBeCalledTimes(0)
    })
  
    it('Undo throws error on missing/empty queue/session', async () => {
      expect.assertions(3)
      await Undo({}).catch((err) => expect(err).toEqual(errors.noUndo()))
      await Undo({},{}).catch((err) => expect(err).toEqual(errors.noUndo()))
      await Undo({},{ undoSettings: [] }).catch((err) => expect(err).toEqual(errors.noUndo()))
      await getEnvVars() // clear unused mock
    })
  
    it('canUndo returns falsy on missing/empty queue/session', async () => {
      expect(canUndo()).toBeFalsy()
      expect(canUndo({})).toBeFalsy()
      expect(canUndo({ undoSettings: [] })).toBeFalsy()
      await getEnvVars() // clear unused mock
    })

    it('canUndo gets remaining undo count', async () => {
      expect(canUndo({ undoSettings })).toBe(2)
      await Undo({}, { undoSettings })
      expect(canUndo({ undoSettings })).toBe(1)
      await Undo({}, { undoSettings })
      expect(canUndo({ undoSettings })).toBeFalsy()
      expect(canUndo({ undoSettings })).toBe(0)
    })
  })
})



// MOCKS

jest.mock('fs/promises', () => ({ writeFile: jest.fn(() => Promise.resolve()), readFile: () => Promise.resolve('') }))
jest.mock('../../utils/validate.utils', () => ({ deepUnescape: jest.fn((obj) => obj) }))
jest.mock('../../services/pm2.services', () => ({}))

jest.mock('../../utils/settings.utils', () => ({
  getEnvVars: jest.fn(() => ({})),
  stringifyEnv: (obj) => obj,
  filterOutProps: jest.fn((obj, props) => { process.testProps = props; return obj }),
  getChanged: jest.fn((obj) => obj),
}))

jest.mock('../../config/env.cfg', () => ({
  updateRootPath: () => {},
  defaults: { test: 'default', env: 1, other: false, DB_DIR: '', LOG_DIR: '' },
  formSettings: {
    test:  { type: 'number'               },
    env:   { type: [1,3] , readonly: true },
    other: { type: 'text', readonly: true },
  }
}))