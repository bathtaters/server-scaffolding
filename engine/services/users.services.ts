import type {} from '../middleware/auth.middleware' // Express.User type
import type { AdapterDefinition, AddSchemaOf, FormSchemaOf } from '../types/Model.d'
import type { UserDef } from '../types/Users.d'
import { Role } from '../types/Users'
import { adapterTypes, viewMetaKey } from '../types/Model'
import { metaField } from '../types/gui'
import { formatLong } from '../libs/date'
import { generateToken, encodePassword } from '../utils/auth.utils'
import { modifyOther, noConfirm, badConfirm } from '../config/errors.engine'
import { toNumber } from '../utils/common.utils'


export const userAdapters: AdapterDefinition<UserDef> = {

  [adapterTypes.fromDB]: {},
  
  [adapterTypes.toDB]: {
    username: (username) => username?.toLowerCase(),
    password: async (password, _, data) => {
      if (typeof password !== 'string' || !password) return
      const { pwkey, salt } = await encodePassword(password)
      data.salt = salt
      return pwkey
    },
  },
  
  [adapterTypes.fromUI]: {
    password: (password, data) => {
      if ((data[metaField.button] === 'Add' || data[metaField.button] === 'Update')) {
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
      user[viewMetaKey].corsType = cors?.type
      return cors?.toString()
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