import type { UsersDB } from '../types/Users'
import hat from 'hat'
import crypto from 'crypto'
import { msAgo } from '../libs/date'
import { encode, rateLimiter } from '../config/users.cfg'
import { loginMessages as failureMsg } from '../config/errors.engine'

export type PasswordCallback = (isMatch: boolean, userData: UsersDB) => Promise<void> | void

export const generateToken = () => hat()

export const isLocked = ({ failCount }: Pick<UsersDB,'failCount'>) =>
  (failCount || 0) + 1 >= rateLimiter.maxFails

export const isPastWindow = ({ failTime, locked }: Pick<UsersDB,'failTime'|'locked'>) =>
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

export function testPassword(password: string, accessInt?: number, callback?: PasswordCallback) {
  return async (userData?: UsersDB) => {
    if (!userData) return failureMsg.noUser
    if (userData.locked && !isPastWindow(userData)) return failureMsg.isLocked
    if (accessInt && !(userData.access & accessInt)) return failureMsg.noAccess
    if (!userData.pwkey) return failureMsg.noPassword

    const pwkey = await encrypt(password, userData.salt ?? '', encode.iters, encode.keylen, encode.digest)
    const isMatch = crypto.timingSafeEqual(Buffer.from(userData.pwkey, 'base64url'), pwkey)

    if (callback) await callback(isMatch, userData)
    return isMatch ? userData : failureMsg.noMatch
  }
}
