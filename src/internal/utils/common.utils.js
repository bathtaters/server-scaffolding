const RegEx = require('../libs/regex')

// Remove hyphens & Capitalize all words (For App Title)
const hyphenRegex = [ RegEx(/^\w/), RegEx(/-(\w)/g) ]
exports.capitalizeHyphenated = (str) => str.replace(hyphenRegex[0], a=>a.toUpperCase()).replace(hyphenRegex[1], (_,g)=>' '+g.toUpperCase())

// Filter out duplicate values from array
exports.filterDupes = (arr) => arr.filter((val, idx) => !arr.slice(0,idx).includes(val))

// Check if array has any duplicate values (Returning 1-based index of 1st match)
exports.hasDupes = (array) => array.findIndex((val, idx) => array.slice(0, idx).includes(val)) + 1

// Assigns inner prop in object of objects to each outer key
exports.filterByField = (obj, field) => Object.entries(obj).reduce(
  (res, [key, val]) => val[field] == null ? res : Object.assign(res, { [key]: val[field] })
, {})

// Get all routes except given route
exports.exceptRoute = (skipPath, middleware) => Array.isArray(middleware) ? middleware.map((mw) => exports.exceptRoute(skipPath,mw)) :
  (req,res,next) => RegEx(`^${skipPath}`,'i').test(req.path) ? next() : middleware(req,res,next)

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

// Advanced string splitter (Returns split function from options), enclosures should be open/close char for each enclosure
exports.splitUnenclosed = (splitDelimiter, { trim = true, escape = '\\', enclosures = ['()','{}','""',"''",'[]','<>'] } = {}) => {
  const delimRegex = RegEx('^' + (splitDelimiter.source || RegEx.escapeRegexPattern(splitDelimiter)))
  const [ open, close ] = enclosures.reduce((arrs, item) => [0,1].forEach((i) => { arrs[i] += item[i] }) || arrs, ['',''])
  const updateCounter = (char, counter) => {
    let i 
    (i = close.indexOf(char)) > -1 && counter[i] ?  --counter[i] :
    (i =  open.indexOf(char)) > -1 && ++counter[i]
    return char
  }
  const appendStr = (next, array) => {
    (next = trim ? next.trim() : next) && array.push(next)
    return ''
  }
  
  return (text) => {
    if (typeof text !== 'string') return text

    let array = [], next = ''
    for (let match, counter = enclosures.map(() => 0); text; text = text.slice(1)) {
      if ((match = text.match(delimRegex)) && !Object.values(counter).some((n) => n)) {
        if (match[0].length > 1) text = text.slice(match[0].length - 1)
        next = appendStr(next, array)
      }
      else if (text.charAt(0) === escape) (next += text.charAt(1), text = text.slice(1))
      else next += updateCounter(text.charAt(0), counter)
    }
    appendStr(next, array)
    return array
  }
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

// Get throttled version of func
exports.throttle = (func, interval, callback = null) => {
	let calls = [], timer

	return function throttledCall(...args) {
		switch (args.length) {
			case 0: break
			case 1: calls.push(args[0]); break;
			default: calls.push(args)
		}
		if (timer) clearTimeout(timer)

		timer = setTimeout(() => {
			const result = calls.length ? func(calls) : func()
			calls = []
			callback && callback(result)
		}, interval)
	}
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