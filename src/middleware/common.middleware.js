const { deepUnescape } = require('../utils/validate.utils')

// Add deepUnescape to run on send args
const unescapeMiddleware = (_, res, next) => {
  res.sendUnescaped = res.send
  res.send = (...args) => res.sendUnescaped(...deepUnescape(args))
  next()
}

module.exports = [unescapeMiddleware]