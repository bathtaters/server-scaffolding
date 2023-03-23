const errors = require('../config/errors.engine')
const { access, accessMax, requirePassword } = require('../config/users.cfg')

// Access is a Bit-map stored as an Int, retrieved as an array

const noAccess = Object.keys(access).find((key) => !access[key])

exports.accessInt = (accessArray) => {
  if (!isNaN(accessArray)) {
    const accessInt = +accessArray
    if (accessInt <= accessMax && accessInt >= 0) return accessInt
  }
  if (!accessArray) return 0
  if (!Array.isArray(accessArray)) accessArray = [accessArray]
  
  return accessArray.reduce((int, key) => {
    if (!(key in access)) throw errors.badAccess(key, 'key')
    return int | access[key]
  }, 0)
}

exports.accessArray = (accessInt) => {
  if (!accessInt) return [noAccess]
  if (Array.isArray(accessInt)) return accessInt
  if (typeof accessInt === 'string' && !isNaN(accessInt)) accessInt = +accessInt
  if (typeof accessInt !== 'number' || accessInt < 0 || accessInt > accessMax)
    throw errors.badAccess(accessInt, 'int')
  
  const array = Object.keys(access).filter((key) => access[key] & accessInt)
  return array.length === 0 ? [noAccess] : array
}

exports.hasAccess = (accessIntA, accessIntB) => accessIntA && accessIntB && accessIntA & accessIntB

exports.passwordAccess = exports.accessInt(requirePassword)
