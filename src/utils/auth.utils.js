const hat = require('hat')
const crypto = require('crypto')
const { encode } = require('../config/constants/users.cfg')

exports.generateToken = () => hat()

exports.encodePassword = (password) => {
  const salt = crypto.randomBytes(32).toString('base64url')
  return { salt,
    key: crypto.pbkdf2Sync(password, salt, encode.iters, encode.keylen, encode.digest).toString('base64url')
  }
}

exports.testPassword = (password) => (userData) => {
  if (!userData || !userData.id) return { fail: 'User not found' }
  if (!userData.key) return { fail: 'Password not set' }

  return crypto.timingSafeEqual(
    Buffer.from(userData.key, 'base64url'),
    crypto.pbkdf2Sync(password, userData.salt, encode.iters, encode.keylen, encode.digest)
  ) ? userData : { fail: 'Incorrect password' }
}