import type {} from '../middleware/auth.middleware' // Express.User type
import type { ProfileActions } from '../types/gui.d'
import type { AccessType, RoleType, UserDefinition, UsersHTML, UsersUI } from '../types/Users.d'
import { ModelAccess, Role, NO_ACCESS } from '../types/Users'
import { adapterTypes } from '../types/Model'
import logger from '../libs/log'
import { formatLong } from '../libs/date'
import { decodeCors, encodeCors, displayCors, isRegEx } from '../utils/users.cors'
import { generateToken, encodePassword } from '../utils/auth.utils'
import { modifyOther, noConfirm, badConfirm } from '../config/errors.engine'

// TODO: Add default BitMap getters/setters

export function initAdapters(definitions: UserDefinition) {
  // GET ADAPTERS
  definitions.cors[adapterTypes.get] = decodeCors
  definitions.role[adapterTypes.get] = (role) => new Role(role)
  definitions.password[adapterTypes.get] = (password) => password ? 'YES' : undefined
  definitions.access[adapterTypes.get] = (access) => access ? new ModelAccess(JSON.parse(access)) : undefined

  // SET ADAPTERS
  definitions.cors[adapterTypes.set] = encodeCors
  definitions.role[adapterTypes.set] = (role) => role?.int
  definitions.username[adapterTypes.set] = (username) => username?.toLowerCase()
  definitions.access[adapterTypes.set] = (access) => access ? JSON.stringify(access) : undefined
  definitions.password[adapterTypes.set] = async (password, data) => {
    if (typeof password !== 'string' || !password) return
    const { pwkey, salt } = await encodePassword(password)
    data.salt = salt
    return pwkey
  }
}


export const addAdapter = <D extends Partial<UsersUI>>(data: D) => ({
  id: generateToken(),
  token: generateToken(),
  ...data,
})


const uiToBaseHtml = ({
  cors, role, access, locked,
  failCount, failTime,
  guiCount, guiTime,
  apiCount, apiTime,
  ...user
}: UsersUI): UsersHTML => ({ ...user, access: '', locked: !!locked })

export function guiAdapter(user: UsersUI): UsersHTML
export function guiAdapter(user: UsersUI[]): UsersHTML[]
export function guiAdapter(user: UsersUI | UsersUI[]): UsersHTML | UsersHTML[] {
  if (!user) return []
  if (Array.isArray(user)) return user.map((u) => guiAdapter(u))

  let output = uiToBaseHtml(user);
  try {
    if ('role'     in user) output.role     = user.role?.list.join(', ') ?? NO_ACCESS
    if ('access'   in user) output.access   = user.access?.toString() ?? ''
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


export function adminFormAdapter({ access, role, ...formData }: UsersHTML, _?: Express.User, action?: ProfileActions) {
  let adapted: Omit<UsersHTML, 'role'|'access'> & { role?: RoleType, access?: AccessType } = formData
  
  if (role) adapted.role = Role.fromString(role)
  if (access) adapted.access = typeof access === 'string' ? new ModelAccess([access]) : new ModelAccess(access)

  return confirmPassword(adapted, action)
}


export function userFormAdapter({ access, role, ...formData }: UsersHTML, user?: Express.User, action?: ProfileActions) {
  if (user?.id !== formData.id && !Role.map.admin.intersects(user?.role)) throw modifyOther()

  return confirmPassword(formData, action)
}


// HELPERS -- 
function confirmPassword<D extends Pick<UsersHTML, 'confirm'|'password'>>(formData: D, action?: ProfileActions) {
  if ((action === 'Add' || action === 'Update') && 'password' in formData) {
    if (!formData.confirm) throw noConfirm()
    if (formData.password !== formData.confirm) throw badConfirm()
  }

  delete formData.confirm
  return formData
}