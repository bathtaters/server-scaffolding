const { accessArray, accessInt, decodeCors, encodeCors, displayCors, isRegEx, hasAccess } = require('../utils/users.utils')
const { generateToken, encodePassword } = require('../utils/auth.utils')
const userDef = require('../../config/models.cfg').defaults._users
const errors = require('../config/errors.internal')
const { access } = require('../config/users.cfg')

exports.getAdapter = ({ id, token, username, access, cors, key, guiTime, apiTime }) => ({
  id, token, username, access, guiTime, apiTime,
  password: Boolean(key),
  cors: decodeCors(cors),
})

exports.setAdapter = (data) => {
  if ('access' in data) data.access = accessInt(data.access)
  if ('cors' in data) data.cors = encodeCors(data.cors)
  if ('username' in data) data.username = data.username.toLowerCase()
  if (data.password) {
    const { key, salt } = encodePassword(data.password)
    data.key = key
    data.salt = salt
  }
  delete data.password
  return data
}

exports.addAdapter = ({
  username = userDef.username,
  access = userDef.access,
  cors = userDef.cors,
  password,
}, idKey = 'id') => exports.setAdapter({
  [idKey]: generateToken(),
  token: generateToken(),
  username, access, password, cors
})

exports.guiAdapter = (user) => {
  if (!user) return []
  if (Array.isArray(user)) return user.map(exports.guiAdapter)

  if ('access'  in user) user.access  = accessArray(user.access).join('/')
  if ('guiTime' in user) user.guiTime = user.guiTime ? new Date(user.guiTime).toLocaleString() : '-'
  if ('apiTime' in user) user.apiTime = user.apiTime ? new Date(user.apiTime).toLocaleString() : '-'

  return 'cors'  in user ? ({
    ...user,
    cors: displayCors(user.cors),
    regExCors: isRegEx(user.cors),
    arrayCors: Array.isArray(user.cors),
  }) : user
}

exports.preValidateAdapter = (formData) => {
  if (formData.access && typeof formData.access === 'string') formData.access = formData.access.split(',')
}

exports.schemaAdapter = (schema) => {
  delete schema.password
  schema = { ...schema, key: 'TEXT', salt: 'TEXT' }
  return schema
}

exports.confirmPassword = (formData, _, action) => {
  if ((action === 'Add' || action === 'Update') && 'password' in formData) {
    if (!('confirm' in formData)) throw errors.noConfirm()
    if (formData.password !== formData.confirm) throw errors.badConfirm()
  }

  delete formData.confirm
  return formData
}

exports.guiFormAdapter = ({ id, username, password, confirm }, user, action) => {
  if (user.id !== id && !hasAccess(user.access, access.admin)) throw errors.modifyOther()
  return exports.confirmPassword({ id, username, password, confirm }, action)
}