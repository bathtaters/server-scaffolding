const Model = require('./Model')
const { passwordAccess, accessInt, hasAccess } = require('../utils/users.utils')
const { addAdapter, getAdapter, setAdapter, schemaAdapter } = require('../services/users.services')
const { generateToken, testPassword } = require('../utils/auth.utils')
const errors = require('../config/errors.internal')
const logger = require('../libs/log')
const { access, timestampKeyRegEx } = require('../config/users.cfg')
const { isPm2 } = require('../../config/meta')


class Users extends Model {
  constructor() { 
    super('_users', { schema: schemaAdapter, defaults: false, getAdapter, setAdapter })
    this.bitmapFields.push('access')
    this.validTimestamps = Object.keys(this.schema).filter((k) => timestampKeyRegEx.test(k)).map((k) => k.match(timestampKeyRegEx)[1])
    this.bgThread = Promise.resolve()
  }

  get(id, idKey, updateTimestamp = null) {
    if (updateTimestamp && !this.validTimestamps.includes(updateTimestamp)) logger.warn(`Ignoring request to update invalid '${updateTimestamp}Timestamp': ${id}`)

    return super.get(id, idKey || this.primaryId).then((user) => {
      if (!id && Array.isArray(user)) return user
      if (!user) return user

      if (updateTimestamp && user[this.primaryId]) 
        this.bgThread = super.update(user[this.primaryId], { [`${updateTimestamp}Time`]: new Date().toJSON() })

      return user
    }
    )
  }

  async add(data) {
    const test = await this.validUsername(data.username)
    if (test) throw errors.badUsername(data.username.trim(), test)

    const newData = addAdapter(data, this.primaryId)
    if ((passwordAccess & newData.access) && !newData.password) throw errors.noData('password for GUI access')

    return super.add(newData).then(() => newData[this.primaryId])
  }

  async update(id, data) {
    let current
    if (!data.password && (passwordAccess & accessInt(data.access))) {
      current = await this.custom(`SELECT key FROM ${this.title} WHERE ${this.primaryId} = ?`, [id]).then((r) => r && r[0])
      if (!current) throw errors.noEntry(id)
      if (!current.key) throw errors.noData('password for GUI access')
    }
    if ('access' in data && !(accessInt(data.access) & access.admin)) {
      if (await this.isLastAdmin(id)) throw errors.deleteAdmin()
    }
    if (data.username) {
      const test = await this.validUsername(data.username, id)
      if (test) throw errors.badUsername(data.username.trim(), test)
    }
    return super.update(id, data)
  }

  async remove(id, idKey = null) {
    if (!idKey) idKey = this.primaryId
    if (await this.isLastAdmin(id, idKey)) throw errors.deleteAdmin()
    return super.remove(id, idKey)
  }

  regenToken(id) {
    return super.update(id, { token: generateToken() })
  }

  async checkPassword(username, password, accessLevel) {
    if (!isPm2 && !(await this.count()))
      return this.add({ username, password, access: accessInt(accessLevel) })
        .then((id) => id && this.get(id))
        .then((data) => {
          logger.info(`Created initial user: ${data.username}`)
          return data
        })
    
    return super.get(username.toLowerCase(), 'username', true).then(testPassword(password, accessInt(accessLevel)))
  }

  async checkToken(token, accessLevel) {
    return this.get(token, 'token', 'api').then((user) => !user ? null :
      !hasAccess(user.access, accessInt(accessLevel)) ? false : user
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