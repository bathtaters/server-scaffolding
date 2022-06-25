const errors = require('../config/errors.internal')
const { extractId } = require('../utils/db.utils')
const searchURL = require('../../config/urls.cfg').gui.basic.find

exports.labels = [ 'Search', 'Add', 'Update', 'Remove', 'Reset' ]

// Actions based on Form submit button label
exports.modelActions = (Model) => ({

  // SEARCH
  [exports.labels[0]]: (formData) => {
    return Promise.resolve(
      !formData || !Object.keys(formData).length ? '' :
        `${searchURL}?${new URLSearchParams(formData).toString()}`
    )
  },

  // ADD
  [exports.labels[1]]: async (formData) => {
    const [_, data] = extractId(formData, Model.primaryId)
    if (!data || !Object.keys(data).length) throw errors.noData()
    const newId = await Model.add(data)
    if (!newId) throw errors.noAdd()
  },

  // UPDATE
  [exports.labels[2]]: (formData) => {
    const [id, data] = extractId(formData, Model.primaryId)
    if (!id && id !== 0) throw errors.noID()
    if (!data || !Object.keys(data).length) throw errors.noData()
    return Model.update(id, data).then(() => {})
  },

  // REMOVE
  [exports.labels[3]]: (formData) => {
    const id = formData[Model.primaryId]
    if (!id && id !== 0) throw errors.noID()
    return Model.remove(id).then(() => {})
  },

  // RESET
  [exports.labels[4]]: () => Model.create(true).then(() => {})
})


// Filter function for Object
exports.filterFormData = (formData, filterCb = (val,key) => val || val === 0) => Object.entries(formData).reduce(
  (filtered, [key, val]) => filterCb(val,key) ? Object.assign(filtered, { [key]: val }) : filtered
, {})