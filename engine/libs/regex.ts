import RE2 from 're2'

// @ts-ignore
const RegEx: typeof RE2 = (pattern, flags) => new RE2(pattern, flags)
export default RegEx

const regexChars = new RE2(/([\.\^\$\(\[\]\)\|])/g)
export const escapeRegexPattern = (string: string) => string.replace(regexChars,'\\$1') 
