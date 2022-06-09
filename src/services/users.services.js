const { accessArray, accessInt } = require('../utils/access.utils')
const { generateToken, encodePassword } = require('../utils/auth.utils')

exports.formatNew = ({ username, password, access, urls }) => {
  const userObj = password ? encodePassword(password) : {}
  userObj.id = generateToken()
  userObj.username = username
  userObj.access = typeof access === 'number' ? access : accessInt(access)
  if (urls && urls !== '*') userObj.urls = urls
  return userObj
}


exports.formatGet = ({ id, username, access, urls, key }) => ({
  id, username, access,
  password: Boolean(key),
  urls: urls || '"*"',
})


exports.formatUsers = (users) => !users ? [] : users.map((usr) => {
  usr.access = accessArray(usr.access).join('/')
  usr.urls = usr.urls === '"*"' ? '*' : usr.urls
  return usr
})


exports.formatFormData = (formData, action) => {
  if ('access' in formData) formData.access = accessInt(formData.access)
  
  if ('urls' in formData) formData.urls = formData.urls === '*' ? null : formData.urls

  if ((action === 'Add' || action === 'Update') && 'password' in formData) {
    if (!('confirm' in formData)) throw new Error('Must confirm password')
    if (formData.password !== formData.confirm) throw new Error('Passwords don\'t match')
  }

  delete formData.confirm

  return formData
}