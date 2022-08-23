const logger = require('../libs/log')
const { formatLong } = require('../libs/date')
const {
  accessArray, accessInt, hasAccess,
  decodeCors, encodeCors, displayCors, isRegEx,
  getModelsString, modelsArrayToObj, modelAccessToInts
} = require('../utils/users.utils')
const { generateToken, encodePassword } = require('../utils/auth.utils')
const { access } = require('../config/users.cfg')
const { adapterKey } = require('../config/models.cfg')
const errors = require('../config/errors.engine')

exports.initAdapters = (definitions) => {
  // GET ADAPTERS
  definitions.pwkey[adapterKey.get] = (pwkey,data) => { data.password = Boolean(pwkey) }
  definitions.cors[adapterKey.get] = (cors) => decodeCors(cors)
  definitions.models[adapterKey.get] = (models) => {
    let updated = '<ERROR>'
    try { updated = typeof models === 'string' && models ? JSON.parse(models) : models || [] }
    catch (err) { err.name = 'User.get'; logger.error(err) }
    return updated
  }
  // SET ADAPTERS
  definitions.models[adapterKey.set] = (models) => JSON.stringify(modelAccessToInts(models) || {})
  definitions.access[adapterKey.set] = (access) => accessInt(access)
  definitions.cors[adapterKey.set] = (cors) => encodeCors(cors)
  definitions.username[adapterKey.set] = (username) => username.toLowerCase()
  definitions.password[adapterKey.set] = async (password, data) => {
    if (password) {
      const { pwkey, salt } = await encodePassword(password)
      data.pwkey = pwkey
      data.salt = salt
    }
  }
}

exports.addAdapter = (data, idKey = 'id') => ({
  [idKey]: generateToken(),
  token: generateToken(),
  ...data,
})

exports.guiAdapter = (user) => {
  if (!user) return []
  if (Array.isArray(user)) return user.map(exports.guiAdapter)

  try {
    if ('access'   in user) user.access   = accessArray(user.access).join(', ')
    if ('models'   in user) user.models   = getModelsString(user.models)
    if ('locked'   in user) user.locked   = Boolean(user.locked)
    if ('guiTime'  in user) user.guiTime  = `${formatLong(user.guiTime) } [${user.guiCount  || 0}]`
    if ('apiTime'  in user) user.apiTime  = `${formatLong(user.apiTime) } [${user.apiCount  || 0}]`
    if ('failTime' in user) user.failTime = `${formatLong(user.failTime)} [${user.failCount || 0}]`
    if ('cors'     in user) {
      user.regExCors = isRegEx(user.cors)
      user.arrayCors = Array.isArray(user.cors)
      user.cors      = displayCors(user.cors)
    }
  } catch (err) {
    err.name = 'User.gui'
    logger.error(err)
    user.hadError = true
  }

  return user
}

exports.adminFormAdapter = (formData, _, action) => {
  if ('models' in formData) formData.models = modelsArrayToObj(formData.models)
  return confirmPassword(formData, action)
}

exports.userFormAdapter = (formData, user, action) => {
  if (user.id !== formData.id && !hasAccess(user.access, access.admin)) throw errors.modifyOther()
  return confirmPassword(formData, action)
}


// HELPERS -- 
function confirmPassword(formData, action) {
  if ((action === 'Add' || action === 'Update') && 'password' in formData) {
    if (!formData.confirm) throw errors.noConfirm()
    if (formData.password !== formData.confirm) throw errors.badConfirm()
  }

  delete formData.confirm
  return formData
}