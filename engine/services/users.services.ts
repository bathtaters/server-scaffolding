import type {} from '../middleware/auth.middleware' // Express.User type
import type { AdapterDefinition, AddSchemaOf, HTMLSchemaOf, SchemaOf } from '../types/Model.d'
import type { ProfileActions } from '../types/gui.d'
import type { UserDef, AccessType, RoleType } from '../types/Users.d'
import { ModelAccess, Role, NO_ACCESS } from '../types/Users'
import { adapterTypes } from '../types/Model'
import logger from '../libs/log'
import { formatLong } from '../libs/date'
import { decodeCors, encodeCors, displayCors, isRegEx } from '../utils/users.cors'
import { generateToken, encodePassword } from '../utils/auth.utils'
import { modifyOther, noConfirm, badConfirm } from '../config/errors.engine'

// TODO: Remove 'as any's without causing issues

export function initAdapters(definitions: AdapterDefinition<UserDef>) {
  // GET ADAPTERS
  definitions[adapterTypes.get].cors = (cors) => decodeCors(cors) as any
  definitions[adapterTypes.get].role = (role) => new Role(role)
  definitions[adapterTypes.get].password = (password) => password ? '[MASKED]' : undefined
  definitions[adapterTypes.get].access = (access) => access ? new ModelAccess(JSON.parse(access)) as any : undefined

  // SET ADAPTERS
  definitions[adapterTypes.set].cors = encodeCors
  definitions[adapterTypes.set].role = (role) => role?.int
  definitions[adapterTypes.set].username = (username) => username?.toLowerCase()
  definitions[adapterTypes.set].access = (access) => access ? JSON.stringify(access) : undefined
  definitions[adapterTypes.set].password = async (password, data) => {
    if (typeof password !== 'string' || !password) return
    const { pwkey, salt } = await encodePassword(password)
    data.salt = salt
    return pwkey
  }
}


export const addAdapter = (data: Omit<AddSchemaOf<UserDef>, 'id'|'token'>) => ({
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
}: SchemaOf<UserDef>): HTMLSchemaOf<UserDef> => ({ ...user, access: '', locked: Boolean(locked).toString() })

export function guiAdapter(user: SchemaOf<UserDef>):   HTMLSchemaOf<UserDef>
export function guiAdapter(user: SchemaOf<UserDef>[]): HTMLSchemaOf<UserDef>[]
export function guiAdapter(user: SchemaOf<UserDef> | SchemaOf<UserDef>[]): HTMLSchemaOf<UserDef> | HTMLSchemaOf<UserDef>[] {
  if (!user) return []
  if (Array.isArray(user)) return user.map((u) => guiAdapter(u))

  let output = uiToBaseHtml(user);
  try {
    if ('role'     in user) output.role     = user.role?.list.join(', ') ?? NO_ACCESS
    if ('access'   in user) output.access   = user.access?.toString() ?? ''
    if ('locked'   in user) output.locked   = Boolean(user.locked).toString()
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


export function adminFormAdapter({ access, role, ...formData }: HTMLSchemaOf<UserDef>, _?: Express.User, action?: ProfileActions) {
  let adapted: Omit<HTMLSchemaOf<UserDef>, 'role'|'access'> & { role?: RoleType, access?: AccessType } = formData
  
  if (role) adapted.role = Role.fromString(role)
  if (access) adapted.access = typeof access === 'string' ? new ModelAccess([access]) : new ModelAccess(access)

  return confirmPassword(adapted as any, action) // TODO: Remove 'as any' once HTMLSchema type is improved
}


export function userFormAdapter({ access, role, ...formData }: HTMLSchemaOf<UserDef>, user?: Express.User, action?: ProfileActions) {
  if (user?.id !== formData.id && !Role.map.admin.intersects(user?.role)) throw modifyOther()

  return confirmPassword(formData, action)
}


// HELPERS -- 
function confirmPassword<D extends Pick<HTMLSchemaOf<UserDef>, 'confirm'|'password'>>(formData: D, action?: ProfileActions) {
  if ((action === 'Add' || action === 'Update') && 'password' in formData) {
    if (!formData.confirm) throw noConfirm()
    if (formData.password !== formData.confirm) throw badConfirm()
  }

  delete formData.confirm
  return formData
}