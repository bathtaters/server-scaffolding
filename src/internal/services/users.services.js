const { accessArray, accessInt, decodeCors, encodeCors, displayCors, isRegEx, hasAccess } = require('../utils/users.utils')
const { generateToken, encodePassword } = require('../utils/auth.utils')
const userDef = require('../../config/validation.cfg').defaults._users
const errors = require('../../config/error.messages')
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

exports.guiAdapter = (user) => !user ? [] : Array.isArray(user) ? user.map(exports.guiAdapter) : ({
  ...user,
  access: accessArray(user.access).join('/'),
  arrayCors: Array.isArray(user.cors),
  regExCors: isRegEx(user.cors),
  cors: displayCors(user.cors),
  guiTime: user.guiTime ? new Date(user.guiTime).toLocaleString() : '-',
  apiTime: user.apiTime ? new Date(user.apiTime).toLocaleString() : '-',
})

exports.preValidateAdapter = (formData) => {
  if (formData.access && typeof formData.access === 'string') formData.access = [formData.access]
}

exports.schemaAdapter = (schema) => {
  delete schema.password
  schema = { ...schema, key: 'TEXT', salt: 'TEXT' }
  return schema
}

exports.confirmPassword = (formData, action) => {
  if ((action === 'Add' || action === 'Update') && 'password' in formData) {
    if (!('confirm' in formData)) throw errors.noConfirm()
    if (formData.password !== formData.confirm) throw errors.badConfirm()
  }

  delete formData.confirm
  return formData
}

exports.guiFormAdapter = ({ id, username, password, confirm }, action, user) => {
  if (user.id !== id && !hasAccess(user.access, access.admin)) throw errors.modifyOther()
  return exports.confirmPassword({ id, username, password, confirm }, action)
}