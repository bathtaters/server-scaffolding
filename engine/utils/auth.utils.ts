import type { RoleType, UserDef } from '../types/Users.d'
import type { DBSchemaOf } from '../types/Model.d'
import hat from 'hat'
import crypto from 'crypto'
import { msAgo } from '../libs/date'
import { encode, rateLimiter } from '../config/users.cfg'
import { loginMessages as failureMsg } from '../config/errors.engine'

export type PasswordCallback = (isMatch: boolean, userData: Partial<DBSchemaOf<UserDef>>) => Promise<void> | void

export const generateToken = () => hat()

export const isLocked = ({ failCount }: Partial<Pick<DBSchemaOf<UserDef>,'failCount'>>) =>
  (failCount || 0) + 1 >= rateLimiter.maxFails

export const isPastWindow = ({ failTime, locked }: Partial<Pick<DBSchemaOf<UserDef>,'failTime'|'locked'>>) =>
  failTime && (rateLimiter.autoUnlock || !locked) &&
    msAgo(failTime) > rateLimiter.failWindow

const encrypt = (password: string, salt: string, iterations: number, keylen: number, digest: string) =>
  new Promise<Buffer>((res, rej) => {
    crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, pwkey) => err ? rej(err) : res(pwkey))
  })

export const encodePassword = async (password: string) => {
  const salt = crypto.randomBytes(32).toString('base64url')
  const pwkey = await encrypt(password, salt, encode.iters, encode.keylen, encode.digest)
  return { salt, pwkey: pwkey.toString('base64url') }
}

export async function testPassword<D extends Partial<DBSchemaOf<UserDef>>>
(userData: D | undefined, password: string, role?: RoleType, callback?: PasswordCallback)
{
  if (!userData) return failureMsg.noUser
  if (userData.locked && !isPastWindow(userData)) return failureMsg.isLocked
  if (role && !role.intersects(userData.role)) return failureMsg.noRole
  if (!userData.password) return failureMsg.noPassword

  const pwkey = await encrypt(password, userData.salt ?? '', encode.iters, encode.keylen, encode.digest)
  const isMatch = crypto.timingSafeEqual(Buffer.from(userData.password, 'base64url'), pwkey)

  if (callback) await callback(isMatch, userData)
  return isMatch ? userData : failureMsg.noMatch
}
