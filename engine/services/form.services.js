const errors = require('../config/errors.engine')
const { extractId } = require('../utils/db.utils')

const { config } = require('../src.path')
const { actions } = require(config+'gui.cfg')
const searchURL = require(config+'urls.cfg').gui.basic.find

// Actions based on Form submit button label
module.exports = (Model) => ({

  // SEARCH
  [actions.find]: async (formData) => {
    if (!formData || !Object.keys(formData).length) return ''
    if (!Object.keys(formData).length) return ''
    return `${searchURL}?${new URLSearchParams(formData).toString()}`
  },

  // ADD
  [actions.create]: async (formData) => {
    const [_, data] = extractId(formData, Model.primaryId)
    if (!data || !Object.keys(data).length) throw errors.noData()
    const result = await Model.add(data)
    if (!result) throw errors.noAdd()
  },

  // UPDATE
  [actions.update]: (formData) => {
    const [id, data] = extractId(formData, Model.primaryId)
    if (!id && id !== 0) throw errors.noID()
    if (!data || !Object.keys(data).length) throw errors.noData()
    return Model.update(id, data).then(() => {})
  },

  // REMOVE
  [actions.delete]: (formData) => {
    const id = formData[Model.primaryId]
    if (!id && id !== 0) throw errors.noID()
    return Model.remove(id).then(() => {})
  },

  // RESET
  [actions.clear]: () => Model.create(true).then(() => {})
})
