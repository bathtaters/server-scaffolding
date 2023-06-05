import type { UserDef } from '../types/Users.d'
import type { AddSchemaOf, SchemaOf } from '../types/Model.d'
import { ModelAccess, Role } from '../types/Users'
import Users from '../models/Users'
import Test from './Test.model'
import { ObjFlagType } from '../types/BitMapObj'

/** Data from Test model */
export const testModelData = {
  Model: Test,
  testKey: 'name',
  idKey: Test.primaryId,
  prefix: { api: '/api/test', gui: '/gui/db/test' },
} as const

/** Create a new user, returning their data */
export function createUser(userSettings: AddSchemaOf<UserDef>) {
  return Users.addAndReturn([userSettings]) as Promise<UserInfo>
}

/** Create an Admin, as a buffer to avoid 'Remove last admin' errors */
export function createAdmin(username = '_failsafeAdmin') {
  return createUser({ username, password: 'randompassword12', role: new Role('admin') })
}

/** Update userInfo with newInfo, both in the database and mutate userInfo object */
export async function updateUser(userInfo: UserInfo, newInfo: UserInfo) {
  if (!userInfo[Users.primaryId]) throw new Error('Unable to update user, no ID provided')

  await Users.update(userInfo[Users.primaryId], newInfo)

  const data = await Users.get(newInfo[Users.primaryId] ?? userInfo[Users.primaryId]) as any

  for (const key in data) {
    userInfo[key as keyof UserInfo] = data[key]
  }
}

/** Create a new ModelAccess object using the given properties */
export function access(acc: ObjFlagType<typeof ModelAccess> | 'rw' = 'none', key: string = 'default') {
  return new ModelAccess({ [key]: acc === 'rw' ? ['read','write'] : acc }, 'none')
}

/** Create a new user and fetch their API Authorization Header */
export async function getApiHeader(settings: UserInfo = {}) {
  const { token } = await createUser({ username: 'test', role: new Role(['api']), ...settings })
  return { Authorization: `Bearer ${token}` }
}

/** Partial User Schema */
export type UserInfo = Partial<SchemaOf<UserDef,false>>