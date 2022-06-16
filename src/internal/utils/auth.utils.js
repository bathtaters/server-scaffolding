const hat = require('hat')
const crypto = require('crypto')
const { encode } = require('../config/users.cfg')
const failureMsg = require('../../config/error.messages').loginMessages

exports.generateToken = () => hat()

exports.encodePassword = (password) => {
  const salt = crypto.randomBytes(32).toString('base64url')
  return { salt,
    key: crypto.pbkdf2Sync(password, salt, encode.iters, encode.keylen, encode.digest).toString('base64url')
  }
}

exports.testPassword = (password, accessInt) => (userData) => {
  if (!userData || !Object.keys(userData).length) return failureMsg.noUser
  if (!(userData.access & accessInt)) return failureMsg.noAccess
  if (!userData.key) return failureMsg.noPassword

  return crypto.timingSafeEqual(
    Buffer.from(userData.key, 'base64url'),
    crypto.pbkdf2Sync(password, userData.salt, encode.iters, encode.keylen, encode.digest)
  ) ? userData : failureMsg.noMatch
}