// Remove hyphens & Capitalize all words (For App Title)
exports.capitalizeHyphenated = (str) => str.replace(/^\w/, a=>a.toUpperCase()).replace(/-(\w)/g, (_,g)=>' '+g.toUpperCase())

// Filter out duplicate values from array
exports.filterDupes = (arr) => arr.filter((val, idx) => !arr.slice(0,idx).includes(val))

// Check if array has any duplicate values
exports.hasDupes = (array) => array.some((val, idx) => array.slice(0, idx).includes(val))

// Get all routes except given route
exports.notRoute = (url) => RegExp(`^(?!(${url})($|/.*))`)

// Get object key case-insensitive
exports.getMatchingKey = (object, propAnyCase) => {
  if (propAnyCase in object) return propAnyCase
  const lowerProp = propAnyCase.toLowerCase()
  if (lowerProp in object) return lowerProp
  return Object.keys(object).find((p) => lowerProp === p.toLowerCase())
}

exports.caseInsensitiveObject = (object) => object && new Proxy(object, {
  has(object, prop) {
    return Boolean(exports.getMatchingKey(object, prop))
  },
  get(object, prop) {
    return object[exports.getMatchingKey(object, prop) || prop]
  },
  set(object, prop, val) {
    object[exports.getMatchingKey(object, prop) || prop] = val
    return true
  },
  deleteProperty(object, prop) {
    delete object[exports.getMatchingKey(object, prop) || prop]
    return true
  },
})