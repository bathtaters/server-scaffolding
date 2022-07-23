const { labels, labelsByAccess, modelActions, filterFormData } = require('../../services/form.services')
const { deepUnescape } = require('../../utils/validate.utils')
const errors = require('../../config/errors.internal')
const prefix = require('../../../config/urls.cfg').gui.basic.find

jest.mock('../../utils/db.utils', () => ({ extractId: (data, id) => [id,data] }))
jest.mock('../../utils/validate.utils', () => ({
  parseBoolean: () => () => 'parsed',
  deepUnescape: jest.fn((o) => o)
}))

describe('labels', () => {
  it('is string array', () => {
    expect(Array.isArray(labels)).toBeTruthy()
    labels.forEach((label) => expect(typeof label).toBe('string'))
  })
})

describe('labelsByAccess', () => {
  it('gets all vals', () => {
    expect(labelsByAccess(['read','write'])).toEqual(labels)
  })
  it('gets read-only vals', () => {
    expect(labelsByAccess(['read'])).toEqual(['Search'])
  })
  it('gets write-only vals', () => {
    expect(labelsByAccess(['write'])).toEqual(['Add','Update','Remove','Reset'])
  })
  it('gets no vals w/o read/write', () => {
    expect(labelsByAccess(['other'])).toEqual([])
    expect(labelsByAccess([])).toEqual([])
  })
})

describe('filterFormData', () => {
  it('removes null values', () => {
    expect(filterFormData({ a: 1, b: null, c: 3 })).toEqual({ a: 1, c: 3 })
    expect(filterFormData({ a: 1, b: 2, c: undefined })).toEqual({ a: 1, b: 2 })
  })
  it('removes empty strings', () => {
    expect(filterFormData({ a: 1, b: '', c: 3 })).toEqual({ a: 1, c: 3 })
    expect(filterFormData({ a: 1, b: 2, c: '', d: '' })).toEqual({ a: 1, b: 2 })
  })
  it('force includes boolFields', () => {
    expect(filterFormData({ a: 1 }, ['b','c'])).toEqual({ a: 1, b: false, c: false })
  })
  it('runs boolFields through parseBool', () => {
    expect(filterFormData({ a: 1, b: 0, c: true }, ['b','c','d']))
      .toMatchObject({ a: 1, b: 'parsed', c: 'parsed', })
  })
  it('allows custom filter', () => {
    expect(filterFormData({ a: 1, b: 2, c: 3 }, [], (val) => val !== 2))
      .toEqual({ a: 1, c: 3 })
    expect(filterFormData({ a: 1, b: 2, c: 3 }, [], (val,key) => key !== 'c'))
      .toEqual({ a: 1, b: 2 })
  })
})


describe('modelActions', () => {

  const spies = {
    primaryId: 'a',
    boolFields: [],
    create: jest.fn(() => Promise.resolve(true)),
    add:    jest.fn(() => Promise.resolve(true)),
    update: jest.fn(() => Promise.resolve(true)),
    remove: jest.fn(() => Promise.resolve(true)),
  }
  const actions = modelActions(spies)

  describe('Search', () => {
    const search = actions.Search

    it('returns string', () => {
      expect.assertions(2)
      return Promise.all([
        search({}).then((res) => expect(typeof res).toBe('string')),
        search({ a: 1 }).then((res) => expect(typeof res).toBe('string'))
      ])
    })
    it('returns query string of input', () => {
      expect.assertions(2)
      return Promise.all([
        search({ a: 1 }).then((res) => expect(res).toBe(prefix+'?a=1')),
        search({ a: 1, b: '2' }).then((res) => expect(res).toBe(prefix+'?a=1&b=2'))
      ])
    })
    it('returns nothing string when no input', () => {
      expect.assertions(2)
      return Promise.all([
        search({}).then((res) => expect(res).toBe('')),
        search().then((res) => expect(res).toBe(''))
      ])
    })
    it('deep unescapes input', () => {
      expect.assertions(2)
      return search({ a: 1, b: '2', c: true }).then(() => {
        expect(deepUnescape).toBeCalledTimes(1)
        expect(deepUnescape).toBeCalledWith({ a: 1, b: '2', c: true })
      })
    })
  })

  describe('Add', () => {
    const add = actions.Add

    it('returns falsy', () => {
      expect.assertions(1)
      return add({ a: 1 }).then((res) => expect(res).toBeFalsy())
    })
    it('passes data to add()', () => {
      expect.assertions(1)
      return add({ a: 1 }).then(() => expect(spies.add).toBeCalledWith({ a: 1 }))
    })
    it('error on no data', () => {
      expect.assertions(2)
      return Promise.all([
        add({}).catch((err) => expect(err).toEqual(errors.noData())),
        add().catch((err) => expect(err).toEqual(errors.noData()))
      ])
    })
    it('error on no return', () => {
      expect.assertions(1)
      spies.add.mockImplementationOnce(() => false)
      return add({ a: 1 }).catch((err) => expect(err).toEqual(errors.noAdd()))
    })
  })

  describe('Update', () => {
    const update = actions.Update

    it('returns falsy', () => {
      expect.assertions(1)
      return update({ a: 1 }).then((res) => expect(res).toBeFalsy())
    })
    it('passes data to update()', () => {
      expect.assertions(1)
      return update({ a: 1 }).then(() => expect(spies.update).toBeCalledWith('a', { a: 1 }))
    })
    it('error on no data', () => {
      expect.assertions(2)
      expect(() => update({})).toThrowError(errors.noData())
      expect(() => update()).toThrowError(errors.noData())
    })
    it('error on no id', () => {
      expect.assertions(1)
      spies.primaryId = null
      expect(() => update({ a: 1 })).toThrowError(errors.noID())
      spies.primaryId = 'a'
    })
  })

  describe('Remove', () => {
    const remove = actions.Remove

    it('returns falsy', () => {
      expect.assertions(1)
      return remove({ a: 1 }).then((res) => expect(res).toBeFalsy())
    })
    it('passes id to remove()', () => {
      expect.assertions(1)
      return remove({ a: 1 }).then(() => expect(spies.remove).toBeCalledWith(1))
    })
    it('error on no ID', () => {
      expect.assertions(2)
      expect(() => remove({})).toThrowError(errors.noID())
      expect(() => remove({ b: 2 })).toThrowError(errors.noID())
    })
  })

  describe('Reset', () => {
    const reset = actions.Reset

    it('returns falsy', () => {
      expect.assertions(1)
      return reset().then((res) => expect(res).toBeFalsy())
    })
    it('calls create()', () => {
      expect.assertions(1)
      return reset().then(() => expect(spies.create).toBeCalled())
    })
  })
})