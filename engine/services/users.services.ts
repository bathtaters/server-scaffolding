import type {} from '../middleware/auth.middleware' // Express.User type
import type { AdapterDefinition, AddSchemaOf, FormSchemaOf } from '../types/Model.d'
import type { UserDef } from '../types/Users.d'
import { ModelAccess, Role, NO_ACCESS } from '../types/Users'
import { adapterTypes } from '../types/Model'
import { formatLong } from '../libs/date'
import { decodeCors, encodeCors, displayCors, isRegEx } from '../utils/users.cors'
import { generateToken, encodePassword } from '../utils/auth.utils'
import { modifyOther, noConfirm, badConfirm } from '../config/errors.engine'

export function initAdapters(definitions: AdapterDefinition<UserDef>) {
  // FROM DB ADAPTERS
  definitions[adapterTypes.fromDB].cors = (cors) => decodeCors(cors)
  definitions[adapterTypes.fromDB].role = (role) => new Role(role)
  definitions[adapterTypes.fromDB].access = (access) => access ? new ModelAccess(JSON.parse(access)) : undefined

  // TO DB ADAPTERS
  definitions[adapterTypes.toDB].cors = encodeCors
  definitions[adapterTypes.toDB].role = (role) => role?.int
  definitions[adapterTypes.toDB].username = (username) => username?.toLowerCase()
  definitions[adapterTypes.toDB].access = (access) => access ? JSON.stringify(access) : undefined
  definitions[adapterTypes.toDB].password = async (password, data) => {
    if (typeof password !== 'string' || !password) return
    const { pwkey, salt } = await encodePassword(password)
    data.salt = salt
    return pwkey
  }

  // FROM GUI ADAPTERS
  definitions[adapterTypes.fromUI].role   = (role)   => role   != null ? Role.fromString(role)   : undefined
  definitions[adapterTypes.fromUI].access = (access) => access != null ? new ModelAccess(access) : undefined
  definitions[adapterTypes.fromUI].password = (password, data) => {
    if ((data._action === 'Add' || data._action === 'Update')) {
      if (!data.confirm) throw noConfirm()
      if (password !== data.confirm) throw badConfirm()
    }
  }

  // TO GUI ADAPTERS
  definitions[adapterTypes.toUI].role     = (role)   => role?.list.join(', ') ?? NO_ACCESS
  definitions[adapterTypes.toUI].access   = (access) => access?.toString() ?? ''
  definitions[adapterTypes.toUI].guiTime  = (time, user) => `${formatLong(time)} [${user.guiCount  || 0}]`
  definitions[adapterTypes.toUI].apiTime  = (time, user) => `${formatLong(time)} [${user.apiCount  || 0}]`
  definitions[adapterTypes.toUI].failTime = (time, user) => `${formatLong(time)} [${user.failCount || 0}]`
  definitions[adapterTypes.toUI].cors     = (cors, user) => {
    user._meta.regExCors = isRegEx(cors)
    user._meta.arrayCors = Array.isArray(cors)
    return displayCors(cors)
  }
}


export const addAdapter = (data: Omit<AddSchemaOf<UserDef>, 'id'|'token'>) => ({
  id: generateToken(),
  token: generateToken(),
  ...data,
})

/** Safeguard non-admins from editing other user profiles */
export function userFormCheck({ id }: FormSchemaOf<UserDef>, { user }: Express.Request) {
  if (user?.id !== id && !Role.map.admin.intersects(user?.role)) throw modifyOther()
}