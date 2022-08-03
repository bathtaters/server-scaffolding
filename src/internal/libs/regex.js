const RE2 = require('re2')
const RegEx = (pattern, flags) => new RE2(pattern, flags)

const regexChars = new RE2(/([\.\^\$\(\[\]\)\|])/g)
RegEx.escapeRegexPattern = (string) => string.replace(regexChars,'\\$1') 

module.exports = RegEx