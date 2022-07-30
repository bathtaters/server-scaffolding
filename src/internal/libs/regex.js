const RE2 = require('re2')

module.exports = (pattern, flags) => new RE2(pattern, flags)