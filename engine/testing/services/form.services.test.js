const modelActions = require('../../services/form.services')
const errors = require('../../config/errors.engine')
const { config } = require('../../src.path')
const label = require(config+'gui.cfg').actions
const prefix = require(config+'urls.cfg').gui.basic.find

jest.mock('../../utils/db.utils', () => ({ extractId: (data, id) => [id,data] }))

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

  describe('find (Search)', () => {
    const search = actions[label.find]

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
  })

  describe('create (Add)', () => {
    const add = actions[label.create]

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

  describe('update (Update)', () => {
    const update = actions[label.update]

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

  describe('delete (Remove)', () => {
    const remove = actions[label.delete]

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

  describe('clear (Reset)', () => {
    const reset = actions[label.clear]

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