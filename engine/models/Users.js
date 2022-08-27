const Model = require('./Model.engine')
const logger = require('../libs/log')
const { now } = require('../libs/date')
const { passwordAccess, accessInt, hasAccess } = require('../utils/users.utils')
const { addAdapter, initAdapters } = require('../services/users.services')
const { generateToken, testPassword, isLocked, isPastWindow } = require('../utils/auth.utils')
const { access, rateLimiter, timestampKeyRegEx, illegalUsername, definitions } = require('../config/users.cfg')
const { isPm2 } = require('../config/meta')
const errors = require('../config/errors.engine')
const { hasDupes } = require('../utils/common.utils')


class Users extends Model {
  constructor() { 
    super('_users', definitions)
    
    this.validTimestamps = Object.keys(this.schema).filter((k) => timestampKeyRegEx.test(k)).map((k) => k.match(timestampKeyRegEx)[1])

    initAdapters(definitions)
  }

  async get(id, idKey = null, raw = false, updateTimestamp = null, skipCounter = false) {
    if (updateTimestamp && !this.validTimestamps.includes(updateTimestamp)) 
      return logger.warn(`Ignoring request to update invalid '${updateTimestamp}Timestamp': ${id}`)

    const user = await super.get(id, idKey, raw)

    if (!id && Array.isArray(user)) return user
    if (!user) return user

    if (updateTimestamp && user[this.primaryId]) {
      const counter = skipCounter ? {} : { [`${updateTimestamp}Count`]: (user[`${updateTimestamp}Count`] || 0) + 1 }
      await super.update(user[this.primaryId], { [`${updateTimestamp}Time`]: now(), ...counter })
    }
    return user
  }

  async batchAdd(users, ifExists, returns) {
    let isInvalid, idx = -1
    while (++idx < users.length) {
      isInvalid = await this.validUsername(users[idx].username)
      if (isInvalid) break
    }
    if (isInvalid) throw errors.badUsername((users[idx].username || '').trim(), isInvalid)

    users = users.map((user) => {
      const newUser = addAdapter(user, this.primaryId)
      if ((passwordAccess & accessInt(newUser.access)) && !newUser.password)
        throw errors.noData('password for GUI access')
      return newUser
    })

    if (users.length > 1) {
      idx = hasDupes(users.map(({ username }) => (username || '').toLowerCase()).filter(Boolean))
      if (idx) throw errors.badUsername((users[idx - 1].username || '').trim(), errors.usernameMessages.duplicate)
    }
    return super.batchAdd(users, ifExists, returns)
  }

  update(id, data, idKey = null) {
    return super.update(id, data, idKey, async (newData, oldData) => {
      if ('access' in newData && newData.access !== oldData.access) {
        if (!oldData.pwkey && !newData.pwkey && (passwordAccess & accessInt(newData.access)))
          throw errors.noData('password for GUI access')

        if (accessInt(oldData.access) & access.admin && !(accessInt(newData.access) & access.admin)) {
          if (await this.isLastAdmin(oldData.id)) throw errors.deleteAdmin()
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
        newData.failTime = now()
      }
    })
  }

  async remove(id, idKey = null) {
    if (await this.isLastAdmin(id, idKey)) throw errors.deleteAdmin()
    return super.remove(id, idKey)
  }

  regenToken(id) {
    return super.update(id, { token: generateToken() })
  }

  async checkPassword(username, password, accessLevel) {
    if (!isPm2 && !(await this.count()))
      return this.add({ username, password, access: accessInt(accessLevel) })
        .then((data) => {
          logger.info(`Created initial user: ${data.username}`)
          return data
        })
    return super.get(username.toLowerCase(), 'username', true).then(
      testPassword(
        password, accessInt(accessLevel),
        (pass, user) => this.incFailCount(user, {
          reset: pass,
          updateCb: pass ? (data, { guiCount = 0 }) => ({ ...data, guiCount: guiCount + 1 }) : null
        })
      )
    )
  }

  async checkToken(token, accessLevel) {
    return this.get(token, 'token', false, 'api').then((user) => !user ? null :
      (user.locked && !isPastWindow(user)) || !hasAccess(user.access, accessInt(accessLevel)) ? false : user
    )
  }

  async isLastAdmin(id, idKey = null) {
    if (!idKey) idKey = this.primaryId
    else if (!Object.keys(this.schema).includes(idKey)) throw errors.badKey(idKey, this.title)

    const admins = await this.custom(`SELECT ${idKey} FROM ${this.title} WHERE access & ?`, [access.admin])
    if (!admins) throw errors.unknownDb()
    return admins.length < 2 && Boolean(admins.find((u) => u[idKey] === id))
  }

  validUsername(username, ignoreId) {
    if (!username) return errors.usernameMessages.missing
    if (illegalUsername.test(username)) return errors.usernameMessages.illegal
    username = username.toLowerCase()
    return super.get().then((users) => users.every((user) =>
      user[this.primaryId] === ignoreId || user.username !== username) ? 0 : errors.usernameMessages.exists
    )
  }

  async incFailCount(userData, { reset = false, idKey = null, updateCb } = {}) {
    let user = userData
    if (!user || (idKey && !(idKey in user))) throw errors.noID()
    if (idKey) user = await this.get(user[idKey], idKey, true)
    if (!user) throw errors.noEntry(userData[idKey || this.primaryId])
    
    let newData = reset ? { failCount: 0, failTime: null, locked: false } :
      isPastWindow(user) ? { failCount: 1, failTime: now(), locked: false } :
      { failCount: (user.failCount || 0) + 1, failTime: now(), locked: isLocked(user) }
    
    if (updateCb) newData = updateCb(newData, user) || newData
    return super.update(user[this.primaryId], newData)
  }
}

module.exports = new Users()