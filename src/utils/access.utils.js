const { access, accessMax } = require('../config/users.cfg')

const noAccess = Object.keys(access).find((key) => !access[key])

exports.accessInt = (accessArray) => (
  Array.isArray(accessArray) ? accessArray : accessArray ? [accessArray] : []
).reduce((int, key) => {
  if (!(key in access)) throw new Error("Invalid access type: "+key)
  return int | access[key]
}, 0),

exports.accessArray = (accessInt) => {
  if (!accessInt) return [noAccess]
  if (typeof accessInt !== 'number' || accessInt < 0 || accessInt > accessMax)
    throw new Error("Invalid access int: "+accessInt)
  const array = Object.keys(access).filter((key) => access[key] & accessInt)
  return array.length === 0 ? [noAccess] : array
}

exports.hasAccess = (accessInt, accessStr) => (access[accessStr] || 0) & (accessInt || 0)
