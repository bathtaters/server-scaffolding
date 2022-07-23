const errors = require('../config/errors.internal')
const { extractId } = require('../utils/db.utils')
const parseBoolean = require('../utils/validate.utils').parseBoolean(true)
const searchURL = require('../../config/urls.cfg').gui.basic.find

exports.labels = [ 'Search', 'Add', 'Update', 'Remove', 'Reset' ]
const actionAccess = {
  [exports.labels[0]]: 'read',  
  [exports.labels[1]]: 'write', 
  [exports.labels[2]]: 'write', 
  [exports.labels[3]]: 'write', 
  [exports.labels[4]]: 'write', 
}

exports.labelsByAccess = (accessTypes) => exports.labels.filter((action) => accessTypes.includes(actionAccess[action]))

// Actions based on Form submit button label
exports.modelActions = (Model) => ({

  // SEARCH
  [exports.labels[0]]: async (formData) => {
    if (!formData || !Object.keys(formData).length) return ''
    Model.boolFields.forEach((key) => { if (!formData[key]) delete formData[key] })
    if (!Object.keys(formData).length) return ''
    return `${searchURL}?${new URLSearchParams(formData).toString()}`
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
const defaultFilter = (val,key) => val != null && val !== ''
exports.filterFormData = (formData, boolFields = [], filterCb = defaultFilter) => Object.entries(formData).reduce(
  (filtered, [key, val]) => filterCb(val,key) ? Object.assign(filtered, { [key]: boolFields.includes(key) ? parseBoolean(val) : val }) : filtered
, boolFields.reduce((obj, key) => Object.assign(obj, { [key]: false }), {}))