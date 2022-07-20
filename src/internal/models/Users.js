const Model = require('./Model')
const { passwordAccess, accessInt, hasAccess } = require('../utils/users.utils')
const { addAdapter, getAdapter, setAdapter, schemaAdapter } = require('../services/users.services')
const { generateToken, testPassword, isLocked, isPastWindow } = require('../utils/auth.utils')
const errors = require('../config/errors.internal')
const logger = require('../libs/log')
const { access, rateLimiter, timestampKeyRegEx } = require('../config/users.cfg')
const { isPm2 } = require('../../config/meta')


class Users extends Model {
  constructor() { 
    super('_users', { schema: schemaAdapter, defaults: false, getAdapter, setAdapter })
    this.bitmapFields.push('access')
    this.validTimestamps = Object.keys(this.schema).filter((k) => timestampKeyRegEx.test(k)).map((k) => k.match(timestampKeyRegEx)[1])
    this.bgThread = Promise.resolve()
  }

  async get(id, idKey, raw = false, updateTimestamp = null, skipCounter = false) {
    if (updateTimestamp && !this.validTimestamps.includes(updateTimestamp)) 
      return logger.warn(`Ignoring request to update invalid '${updateTimestamp}Timestamp': ${id}`)

    const user = super.get(id, idKey || this.primaryId, raw)

    if (!id && Array.isArray(user)) return user
    if (!user) return user

    if (updateTimestamp && user[this.primaryId]) {
      const counter = skipCounter ? {} : { [`${updateTimestamp}Count`]: (user[`${updateTimestamp}Count`] || 0) + 1 }
      this.bgThread = await super.update(user[this.primaryId], { [`${updateTimestamp}Time`]: new Date().toJSON(), ...counter })
    }
    return user
  }

  async add(data) {
    const test = await this.validUsername(data.username)
    if (test) throw errors.badUsername(data.username.trim(), test)

    const newData = addAdapter(data, this.primaryId)
    if ((passwordAccess & accessInt(newData.access)) && !newData.password)
      throw errors.noData('password for GUI access')

    return super.add(newData).then(() => newData[this.primaryId])
  }

  update(id, data, idKey = this.primaryId) {
    return super.update(id, data, idKey, async (newData, oldData) => {
      if ('access' in newData && newData.access !== oldData.access) {
        if (!oldData.key && !newData.key && (passwordAccess & accessInt(newData.access)))
          throw errors.noData('password for GUI access')

        if (accessInt(oldData.access) & access.admin && !(accessInt(newData.access) & access.admin)) {
          const isOnly = await this.isLastAdmin(oldData.id)
          if (isOnly) throw errors.deleteAdmin()
        }
      }
      
      if (newData.username) {
        const test = await this.validUsername(newData.username, oldData.id)
        if (test) throw errors.badUsername(newData.username.trim(), test)
      }

      if (oldData.locked && !newData.locked) {
        newData.failCount = 0
        newData.failTime = null
      } else if (!oldData.locked && newData.locked) {
        newData.failCount = rateLimiter.maxFails
        newData.failTime = new Date().toJSON()
      }
    })
  }

  async remove(id, idKey = null) {
    if (!idKey) idKey = this.primaryId
    if (await this.isLastAdmin(id, idKey)) throw errors.deleteAdmin()
    return super.remove(id, idKey)
  }

  regenToken(id) {
    return super.update(id, { token: generateToken() })
  }

  async incFailCount(user, reset = false, id = null, idKey = null) {
    if (!user && !id) throw errors.noID()
    if (!user) user = await super.get(id, idKey, true)
    if (!user) throw errors.noEntry(id)
    
    if (reset) return super.update(user.id, { failCount: 0, failTime: null, locked: false, guiCount: (user.guiCount || 0) + 1 })
    if (isPastWindow(user)) return super.update(user.id, { failCount: 1, failTime: new Date().toJSON(), locked: false })
    return super.update(user.id, { failCount: (user.failCount || 0) + 1, failTime: new Date().toJSON(), locked: isLocked(user) })
  }

  async checkPassword(username, password, accessLevel) {
    if (!isPm2 && !(await this.count()))
      return this.add({ username, password, access: accessInt(accessLevel) })
        .then((id) => id && this.get(id))
        .then((data) => {
          logger.info(`Created initial user: ${data.username}`)
          return data
        })
    
    return super.get(username.toLowerCase(), 'username', true).then(
      testPassword(password, accessInt(accessLevel), (pass, user) => this.incFailCount(user, pass))
    )
  }

  async checkToken(token, accessLevel) {
    return this.get(token, 'token', false, 'api').then((user) => !user ? null :
      (user.locked && !isPastWindow(user)) || !hasAccess(user.access, accessInt(accessLevel)) ? false : user
    )
  }

  async isLastAdmin(id, idKey) {
    if (!idKey) idKey = this.primaryId

    const admins = await this.custom(`SELECT ${idKey} FROM ${this.title} WHERE access & ?`, [access.admin])
    if (!admins) throw errors.unknownDb()
    return admins.length < 2 && admins.find((u) => u[idKey] === id)
  }

  validUsername(username, ignoreId) {
    if (/[^a-zA-Z0-9_-]/.test(username)) return 'Cannot contain spaces or symbols (Besides underscore & hyphen)'
    username = username.toLowerCase()
    return super.get().then((users) => users.every((user) =>
      user[this.primaryId] === ignoreId || user.username !== username) ? 0 : 'Username already exists'
    )
  }
}

module.exports = new Users()