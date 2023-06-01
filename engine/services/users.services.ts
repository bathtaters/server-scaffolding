import type {} from '../middleware/auth.middleware' // Express.User type
import type { AdapterDefinition, AddSchemaOf, FormSchemaOf } from '../types/Model.d'
import type { UserDef } from '../types/Users.d'
import { Role } from '../types/Users'
import { adapterTypes, viewMetaKey } from '../types/Model'
import { formatLong } from '../libs/date'
import { decodeCors, encodeCors, displayCors, isRegEx } from '../utils/users.cors'
import { generateToken, encodePassword } from '../utils/auth.utils'
import { modifyOther, noConfirm, badConfirm } from '../config/errors.engine'
import { toNumber } from '../utils/common.utils'


export const userAdapters: AdapterDefinition<UserDef> = {

  [adapterTypes.fromDB]: {
    cors: (cors) => decodeCors(cors) as any,
  },
  
  [adapterTypes.toDB]: {
    cors:     encodeCors,
    username: (username) => username?.toLowerCase(),
    password: async (password, data) => {
      if (typeof password !== 'string' || !password) return
      const { pwkey, salt } = await encodePassword(password)
      data.salt = salt
      return pwkey
    },
  },
  
  [adapterTypes.fromUI]: {
    password: (password, data) => {
      if ((data._action === 'Add' || data._action === 'Update')) {
        if (!data.confirm) throw noConfirm()
        if (password !== data.confirm) throw badConfirm()
      }
    },
  },
  
  [adapterTypes.toUI]: {
    guiTime:  (time, user) => `${formatLong(time)} [${toNumber(user.guiCount)}]`,
    apiTime:  (time, user) => `${formatLong(time)} [${toNumber(user.apiCount)}]`,
    failTime: (time, user) => `${formatLong(time)} [${toNumber(user.failCount)}]`,
    cors:     (cors, _, user) => {
      user[viewMetaKey].regExCors = isRegEx(cors)
      user[viewMetaKey].arrayCors = Array.isArray(cors)
      return displayCors(cors)
    },
  },
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