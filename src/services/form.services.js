const errors = require('../config/constants/error.messages')
const { extractId } = require('../utils/db.utils')

exports.labels = [ 'Add', 'Update', 'Remove', 'Reset' ]

// Actions based on Form submit button label
exports.modelActions = (Model) => ({

  // ADD
  [exports.labels[0]]: async (formData) => {
    const [_, data] = extractId(formData, Model.primaryId)
    if (!data || !Object.keys(data).length) throw errors.noData()
    const newId = await Model.add(data)
    if (!newId) throw errors.noAdd()
  },

  // UPDATE
  [exports.labels[1]]: (formData) => {
    const [id, data] = extractId(formData, Model.primaryId)
    if (id !== 0 && !id) throw errors.noID()
    if (!data || !Object.keys(data).length) throw errors.noData()
    return Model.update(id, data)
  },

  // REMOVE
  [exports.labels[2]]: (formData) => {
    const id = formData[Model.primaryId]
    if (id !== 0 && !id) throw errors.noID()
    return Model.remove(id)
  },

  // RESET
  [exports.labels[3]]: () => Model.create(true)
})


// Filter function for Object
exports.filterFormData = (formData, filterCb = (val,key) => val) => Object.entries(formData).reduce(
  (filtered, [key, val]) => filterCb(val,key) ? Object.assign(filtered, { [key]: val }) : filtered
, {})