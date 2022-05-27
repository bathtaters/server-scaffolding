// Use validator.unescape
const unescaper = require('validator').default.unescape

// Recursively unescape strings using 'unescaper' as defined above
const deepUnescape = (input) => {
  if (typeof input === 'string') return unescaper(input)
  
  if (Array.isArray(input)) return input.map(deepUnescape)
  
  if (input && typeof input === 'object')
    Object.keys(input).forEach((key) => {
      input[key] = deepUnescape(input[key])
    })

  return input
}

// Add deepUnescape to run on send args (must be placed after 'logger.middleware')
const unescapeMiddleware = (_, res, next) => {
  res.sendUnescaped = res.send
  res.send = (...args) => res.sendUnescaped(...deepUnescape(args))
  next()
}

module.exports = unescapeMiddleware