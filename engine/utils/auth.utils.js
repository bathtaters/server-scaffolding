const hat = require('hat')
const crypto = require('crypto')
const { msAgo } = require('../libs/date')
const { encode, rateLimiter } = require('../config/users.cfg')
const failureMsg = require('../config/errors.engine').loginMessages

exports.generateToken = () => hat()

exports.isLocked = ({ failCount }) => (failCount || 0) + 1 >= rateLimiter.maxFails

exports.isPastWindow = ({ failTime, locked }) => failTime && (rateLimiter.autoUnlock || !locked) &&
  msAgo(failTime) > rateLimiter.failWindow

const encrypt = (password, salt, iterations, keylen, digest) => new Promise((res, rej) => {
  crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, pwkey) => err ? rej(err) : res(pwkey))
})

exports.encodePassword = async (password) => {
  const salt = crypto.randomBytes(32).toString('base64url')
  const pwkey = await encrypt(password, salt, encode.iters, encode.keylen, encode.digest)
  return { salt, pwkey: pwkey.toString('base64url') }
}

exports.testPassword = (password, accessInt, callback) => async (userData) => {
  if (!userData || !Object.keys(userData).length) return failureMsg.noUser
  if (userData.locked && !exports.isPastWindow(userData)) return failureMsg.isLocked
  if (accessInt && !(userData.access & accessInt)) return failureMsg.noAccess
  if (!userData.pwkey) return failureMsg.noPassword

  const pwkey = await encrypt(password, userData.salt, encode.iters, encode.keylen, encode.digest)
  const isMatch = crypto.timingSafeEqual(Buffer.from(userData.pwkey, 'base64url'), pwkey)

  if (typeof callback === 'function') await callback(isMatch, userData)
  return isMatch ? userData : failureMsg.noMatch
}