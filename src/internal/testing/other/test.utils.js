exports.deepCopy = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(exports.deepCopy)
  return Object.entries(obj).reduce((copy, [key,val]) =>
    Object.assign(copy, { [key]: exports.deepCopy(val) })
  , {})
}