// Remove hyphens & Capitalize all words (For App Title)
exports.capitalizeHyphenated = (str) => str.replace(/^\w/, a=>a.toUpperCase()).replace(/-(\w)/g, (_,g)=>' '+g.toUpperCase())

// Filter out duplicate values from array
exports.filterDupes = (arr) => arr.filter((val, idx) => !arr.slice(0,idx).includes(val))

// Check if array has any duplicate values
exports.hasDupes = (array) => array.some((val, idx) => array.slice(0, idx).includes(val))

// Get all routes except given route
exports.notRoute = (url) => RegExp(`^(?!(${url})($|/.*))`)

// Run callback on each item & replace with result
exports.deepMap = (input, callback) => {
  if (typeof input !== 'object' || !input) return callback(input)
  
  if (Array.isArray(input))
    input.forEach((val, idx) => {
      input[idx] = exports.deepMap(val, callback)
    })
  
  else
    Object.keys(input).forEach((key) => {
      input[key] = exports.deepMap(input[key], callback)
    })

  return input
}

// Check deep equality
exports.deepEquals = (a, b, compareFunc = (a,b) => a === b) => {
  if (compareFunc(a, b)) return true
  if (typeof a !== 'object') return false
  if (!a || !b) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false

  const keys = Object.keys(a), bKeys = Object.keys(b)
  if (keys.length !== bKeys.length || !bKeys.every((key) => keys.includes(key))) return false
  return keys.every((key) => exports.deepEquals(a[key], b[key]))
}

// Get debounced version of func & func to force next call to use original func
const EMPTY = Symbol('EMPTY')
exports.debounce = (func, { interval = 1000, ignoreArgs = false } = {}) => {
  let result = EMPTY, resultargs
  const forceNextCall = () => { result = EMPTY }
  if (!interval) return [ func, () => {} ]

  return [
    function debouncedFunc(...args) {
      if (result !== EMPTY && (ignoreArgs || exports.deepEquals(args, resultargs))) return result
      
      const newResult = result = func(...args)
      if (!ignoreArgs) resultargs = args

      if (interval > 0) setTimeout(forceNextCall, interval)
      return newResult
    },
    forceNextCall,
  ]
}

// Get object key case-insensitive
exports.getMatchingKey = (object, propAnyCase) => {
  if (propAnyCase in object || typeof propAnyCase !== 'string') return propAnyCase
  const lowerProp = propAnyCase.toLowerCase()
  if (lowerProp in object) return lowerProp
  return Object.keys(object).find((p) => lowerProp === p.toLowerCase())
}

// Create object w/ case insensitive keys
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