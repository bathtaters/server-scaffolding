const { actions, profileActions } = require(require('../src.path').config+'gui.cfg')
const { parseBoolean } = require('../utils/validate.utils')
const parseBool = parseBoolean(true)

// Get list of user profile actions
exports.profileLabels = profileActions.map((action) => actions[action])

// Get list of button labels based on access
exports.actionAccess = (action) => action === actions.find ? 'read' : 'write'
exports.labelsByAccess = (accessTypes) => Object.values(actions).filter((action) => accessTypes.includes(exports.actionAccess(action)))

// Get links to post from base URL
exports.actionURLs = (baseURL, actionList = Object.values(actions)) => actionList.reduce(
  (urls,action) => Object.assign(urls, { [action]: baseURL + action.toLowerCase() })
, {})

// Default filter for filterFormData & toQueryString
const defaultFilter = (val,key) => val != null && val !== ''

// Filter function for Object
exports.filterFormData = (formData, baseObject = {}, filterCb = defaultFilter) => Object.entries(formData).reduce(
  (filtered, [key, val]) => !filterCb(val,key) ? filtered :
    Object.assign(filtered, { [key]: key in baseObject ? parseBool(val) : val })
, { ...baseObject })

// Convert object to queryString (Accepts stringified object, deletes null/empty values)
exports.toQueryString = (obj, filter = defaultFilter) => {
  if (!obj) return ''
  if (typeof obj === 'string') obj = JSON.parse(obj)
  if (typeof obj !== 'object') return ''
  Object.keys(obj).forEach((key) => { if (!filter(obj[key], key)) delete obj[key] })
  return Object.keys(obj).length ? `?${new URLSearchParams(obj).toString()}` : ''
}