import logger from '../libs/log'
import { formatLong } from '../libs/date'
import { accessArray, accessInt, hasAccess } from '../utils/users.access'
import { decodeCors, encodeCors, displayCors, isRegEx } from '../utils/users.cors'
import { getModelsString, modelsArrayToObj, modelAccessToInts } from '../utils/users.model'
import { generateToken, encodePassword } from '../utils/auth.utils'
import { modifyOther, noConfirm, badConfirm } from '../config/errors.engine'
import { ModelObject, UserDefinition, UsersHTML, UsersUI, access, allModelsKey } from '../types/Users.d'
import { adapterTypes } from '../types/Model.d'
import { ProfileActions } from '../types/gui'

// TODO: Add default BitMap getters/setters
// TODO: Update getters/setters to use BitMaps/etc

export function initAdapters(definitions: UserDefinition) {
  // GET ADAPTERS
  definitions.cors[adapterTypes.get] = decodeCors

  definitions.pwkey[adapterTypes.get] = (pwkey,data) => { data.password = Boolean(pwkey) }

  definitions.models[adapterTypes.get] = (models) => {
    let updated: ModelObject<string> = { [allModelsKey]: 0 }
    try { updated = typeof models === 'string' && models ? JSON.parse(models) : models || updated }
    catch (err: any) { err.name = 'User.get'; logger.error(err) }
    return updated
  }

  // SET ADAPTERS
  definitions.cors[adapterTypes.set] = encodeCors

  definitions.access[adapterTypes.set] = accessInt

  definitions.username[adapterTypes.set] = (username) => username.toLowerCase()

  definitions.models[adapterTypes.set] = (models) => JSON.stringify(modelAccessToInts(models) || {})

  definitions.password[adapterTypes.set] = async (password, data) => {
    if (typeof password !== 'string' || !password) return
    const { pwkey, salt } = await encodePassword(password)
    data.pwkey = pwkey
    data.salt = salt
  }
}


export const addAdapter = (data: Partial<UsersUI>, idKey = 'id') => ({
  [idKey]: generateToken(),
  token: generateToken(),
  ...data,
})


const uiToBaseHtml = ({
  cors, access, models,
  failCount, failTime,
  guiCount, guiTime,
  apiCount, apiTime,
  ...user
}: UsersUI): UsersHTML => ({ ...user, models   : '', })

export function guiAdapter(user: UsersUI): UsersHTML
export function guiAdapter(user: UsersUI[]): UsersHTML[]
export function guiAdapter(user: UsersUI | UsersUI[]): UsersHTML | UsersHTML[] {
  if (!user) return []
  if (Array.isArray(user)) return user.map((u) => guiAdapter(u))

  let output = uiToBaseHtml(user);
  try {
    if ('access'   in user) output.access   = accessArray(user.access).join(', ')
    if ('models'   in user) output.models   = getModelsString(user.models)
    if ('locked'   in user) output.locked   = Boolean(user.locked)
    if ('guiTime'  in user) output.guiTime  = `${formatLong(user.guiTime) } [${user.guiCount  || 0}]`
    if ('apiTime'  in user) output.apiTime  = `${formatLong(user.apiTime) } [${user.apiCount  || 0}]`
    if ('failTime' in user) output.failTime = `${formatLong(user.failTime)} [${user.failCount || 0}]`
    if ('cors'     in user) {
      output.regExCors = isRegEx(user.cors)
      output.arrayCors = Array.isArray(user.cors)
      output.cors      = displayCors(user.cors)
    }
  } catch (err: any) {
    err.name = 'User.gui'
    logger.error(err)
    output.hadError = true
  }

  return output
}


export function adminFormAdapter(formData: UsersHTML, _: any, action: ProfileActions) {
  const result: Omit<UsersHTML, 'models'> & { models?: UsersUI['models'] } = {
    ...formData,
    models: formData.models ? modelsArrayToObj(formData.models) : undefined
  }

  return confirmPassword(result, action)
}


export function userFormAdapter(formData: UsersHTML, user: UsersUI, action: ProfileActions) {
  if (user.id !== formData.id && !hasAccess(user.access, access.admin)) throw modifyOther()

  return confirmPassword(formData, action)
}


// HELPERS -- 
function confirmPassword<D extends Pick<UsersHTML, 'confirm'|'password'>>(formData: D, action: ProfileActions) {
  if ((action === 'Add' || action === 'Update') && 'password' in formData) {
    if (!formData.confirm) throw noConfirm()
    if (formData.password !== formData.confirm) throw badConfirm()
  }

  delete formData.confirm
  return formData
}