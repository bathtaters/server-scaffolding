const { formatLong } = require('../libs/date')
const logger = require('../libs/log')
const {
  accessArray, accessInt, hasAccess,
  decodeCors, encodeCors, displayCors, isRegEx,
  getModelsString, modelsArrayToObj, modelAccessToInts
} = require('../utils/users.utils')
const { generateToken, encodePassword } = require('../utils/auth.utils')
const { access, definitions, searchableKeys } = require('../config/users.cfg')
const errors = require('../config/errors.internal')

exports.getAdapter = ({ id, token, username, access, cors, key, models, guiTime, apiTime, failTime, apiCount, guiCount, failCount, locked }) => {
  let updatedFields = { hadError: true }
  try {
    updatedFields = {
      models: models ? JSON.parse(models) : [],
      cors: decodeCors(cors),
    }
  } catch (err) { err.name = 'User.get'; logger.error(err) }
  return {
    id, token, username, access, locked,
    guiTime, apiTime, failTime,
    guiCount, apiCount, failCount,
    password: Boolean(key),
    ...updatedFields
  }
}

exports.setAdapter = async (data) => {
  if ('models' in data) data.models = JSON.stringify(modelAccessToInts(data.models) || {})
  if ('access' in data) data.access = accessInt(data.access)
  if ('cors' in data) data.cors = encodeCors(data.cors)
  if ('username' in data) data.username = data.username.toLowerCase()
  if (data.password) {
    const { key, salt } = await encodePassword(data.password)
    data.key = key
    data.salt = salt
  }
  delete data.password
  return data
}

exports.addAdapter = ({
  username = definitions.defaults.username,
  access = definitions.defaults.access,
  cors = definitions.defaults.cors,
  models = definitions.defaults.models,
  password,
}, idKey = 'id') => ({
  ...definitions.defaults,
  [idKey]: generateToken(),
  token: generateToken(),
  username, access, password, cors, models,
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

exports.preValidateAdapter = (formData, isSearch) => (isSearch && stripNonSearchProps(formData)) || formData

exports.schemaAdapter = ({ password, ...schema }) => ({ ...schema, key: 'TEXT', salt: 'TEXT' })

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

const keepProps = [ ...searchableKeys, '_action', '_pageData', '_searchMode' ]
function stripNonSearchProps(formData) {
  Object.keys(formData).forEach((key) => {
    if (!keepProps.includes(key)) delete formData[key]
  })
}