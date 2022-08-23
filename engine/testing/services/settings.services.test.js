const { settingsDefaults, getSettings, setSettings, canUndo, getForm } = require('../../services/settings.services')
const { readFile, writeFile } = require('fs/promises')
const { parse } = require('dotenv')
const { getSettingsVars, getChanged } = require('../../utils/settings.utils')
const { escapeEnvMsg } = require('../../config/settings.cfg')

describe('settingsDefaults', () => {
  it('includes defaults from settings.cfg.defaults', () => {
    expect(settingsDefaults.obj).toHaveProperty('test', 'default')
  })

  it('overrides defaults from settings.cfg.formDefaults', () => {
    expect(settingsDefaults.obj).toHaveProperty('overwrite', 'yes')
  })

  it('sends readOnly props to filterOutProps to hide', () => {
    expect(settingsDefaults).toHaveProperty('hide', ['env', 'other'])
  })
})


describe('getSettings', () => {
  beforeEach(() => { readFile.mockResolvedValueOnce(12345) })

  it('reads file at envPath', async () => {
    await getSettings()
    expect(readFile).toBeCalledTimes(1)
    expect(readFile).toBeCalledWith('ENV_FILE')
  })
  it('converts to string', async () => {
    expect(typeof await getSettings()).toBe('string')
  })
  it('gets result from readFile', async () => {
    expect(await getSettings()).toBe('12345')
  })
  it('runs through dotenv parser', async () => {
    await getSettings()
    expect(parse).toBeCalledTimes(1)
    expect(parse).toBeCalledWith('12345')
  })
  it('runs through getSettingsVars', async () => {
    await getSettings()
    expect(getSettingsVars).toBeCalledTimes(1)
    expect(getSettingsVars).toBeCalledWith(expect.anything(), '12345')
  })
  it('sends defintions key list to getSettingsVars', async () => {
    await getSettings()
    expect(getSettingsVars).toBeCalledTimes(1)
    expect(getSettingsVars).toBeCalledWith([ 'test', 'env', 'other', 'overwrite' ], expect.anything())
  })
  it('readFile is debounced', async () => {
    expect(process.env.test_debounce).toBe('readFileMock')
  })
})


describe('setSettings', () => {
  beforeEach(() => { getSettingsVars.mockReturnValueOnce({ test: 'val' }) })

  it('writes file at envPath', async () => {
    await setSettings({ test: 'new' })
    expect(writeFile).toBeCalledTimes(1)
    expect(writeFile).toBeCalledWith('ENV_FILE', expect.anything())
  })
  it('writes new settings', async () => {
    await setSettings({ test: 'new' })
    expect(writeFile).toBeCalledTimes(1)
    expect(writeFile).toBeCalledWith(expect.anything(), { test: 'new' })
  })
  it('does not change missing props', async () => {
    await setSettings({ other: 'new' })
    expect(writeFile).toBeCalledTimes(1)
    expect(writeFile).toBeCalledWith(expect.anything(), { test: 'val', other: 'new' })
  })
  it('calls replaceChars on new settings', async () => {
    await setSettings({ test: 'new' })
    expect(escapeEnvMsg).toBeCalledTimes(1)
    expect(escapeEnvMsg).toBeCalledWith({ test: 'new' })
  })
  it('creates undo queue in session', async () => {
    const session = {}
    await setSettings({ test: '1' }, session)
    expect(session).toHaveProperty('undoSettings', expect.any(Array))
    expect(session.undoSettings).toHaveLength(1)
    expect(session.undoSettings[0]).toEqual({ test: 'val' })
    
    getSettingsVars.mockResolvedValueOnce({ test: '1' })
    await setSettings({ test: '2' }, session)
    expect(session.undoSettings).toHaveLength(2)
    expect(session.undoSettings[1]).toEqual({ test: '1' })
  })
  it('checks for changes (if session exists)', async () => {
    await setSettings({ other: 'new' }, {})
    expect(getChanged).toBeCalledTimes(1)
    expect(getChanged).toBeCalledWith({ test: 'val' }, { other: 'new' })
  })
  it('skips write if no changes (and session exists)', async () => {
    getChanged.mockReturnValueOnce({})
    await setSettings({ other: 'new' }, {})
    expect(writeFile).toBeCalledTimes(0)
  })
  it('clears debouncer after change', async () => {
    delete process.env.test_debounceClear
    await setSettings({ test: 'new' })
    expect(process.env.test_debounceClear).toBe('readFileMock')
  })
})


describe('canUndo', () => {
  it('canUndo returns falsy on missing/empty queue/session', async () => {
    expect(canUndo()).toBeFalsy()
    expect(canUndo({})).toBeFalsy()
    expect(canUndo({ undoSettings: [] })).toBeFalsy()
  })
  it('canUndo gets remaining undo count', async () => {
    expect(canUndo({ undoSettings: [1,2] })).toBe(2)
    expect(canUndo({ undoSettings: [1] })).toBe(1)
    expect(canUndo({ undoSettings: [] })).toBe(0)
  })
})


describe('getForm', () => {
  let form
  beforeAll(async () => {
    getSettingsVars.mockReturnValueOnce({ test: 1, env: 2, other: 3 })
    form = await getForm()
  })

  it('gets all envVars', () => {
    expect(form.flatMap(Object.keys)).toEqual(['test','env','other'])
  })
  it('splits in half', () => {
    expect(form.map(Object.keys)).toEqual([['test','env'],['other']])
  })
  it('appends currentVal to array', () => {
    expect(form[0].env.html.type).toEqual([1,3,'2'])
  })
})


// MOCKS

jest.mock('dotenv', () => ({ parse: jest.fn((input) => input) }))

jest.mock('../../libs/log', () => ({ warn: () => {} }))

jest.mock('../../config/meta', () => ({ envPath: 'ENV_FILE' }))

jest.mock('fs/promises', () => ({
  writeFile: jest.fn(() => Promise.resolve()),
  readFile: jest.fn(() => Promise.resolve('')).mockName('readFileMock'),
}))

jest.mock('../../utils/common.utils', () => ({
  debounce: jest.fn((func) => {
    process.env.test_debounce = func.getMockName()
    return [func, jest.fn(() => { process.env.test_debounceClear = func.getMockName() })]
  }),
}))

jest.mock('../../utils/settings.utils', () => ({
  getSettingsVars: jest.fn((_, obj) => obj),
  stringifyEnv: (obj) => obj,
  filterOutProps: jest.fn((obj, hide) => ({ obj, hide })),
  escapeSettings: jest.fn((cb) => (obj) => cb(obj) || obj),
  getChanged: jest.fn((obj) => obj),
}))

jest.mock('../../config/settings.cfg', () => ({
  escapeEnvMsg: jest.fn(),
  definitions: {
    test: { 
      default: 'default',
      html: { type: 'number' },
    },
    env: { 
      default: 1,
      html: { type: [1,3] , readonly: true },
    },
    other: { 
      default: false,
      html: { type: 'text', readonly: true },
    },
    overwrite: { 
      default: 'no',
      formDefault: 'yes',
    },
  },
}))