const { accessArray, accessInt, decodeCors, encodeCors, displayCors, isRegEx } = require('../utils/users.utils')
const { generateToken, encodePassword } = require('../utils/auth.utils')
const userDef = require('../config/constants/validation.cfg').defaults._users
const errors = require('../config/constants/error.messages')

exports.getAdapter = ({ id, token, username, access, cors, key }) => ({
  id, token, username, access,
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
    delete data.password
  }
  return data
}

exports.addAdapter = ({
  username = userDef.username,
  access = userDef.access,
  cors = userDef.cors,
  password,
}) => exports.setAdapter({
  id: generateToken(),
  token: generateToken(),
  username, access, password, cors
})

exports.guiAdapter = (users) => !users ? [] : users.map((usr) => {
  usr.access = accessArray(usr.access).join('/')
  usr.arrayCors = Array.isArray(usr.cors)
  usr.regExCors = isRegEx(usr.cors)
  usr.cors = displayCors(usr.cors)
  return usr
})

exports.preValidateAdapter = (formData) => {
  if (formData.access && typeof formData.access === 'string') formData.access = [formData.access]
}

exports.confirmPassword = (formData, action) => {
  if ((action === 'Add' || action === 'Update') && 'password' in formData) {
    if (!('confirm' in formData)) throw errors.noConfirm()
    if (formData.password !== formData.confirm) throw errors.badConfirm()
  }

  delete formData.confirm
  return formData
}