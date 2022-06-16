const Model = require('./Model')
const { passwordAccess, accessInt } = require('../utils/users.utils')
const { addAdapter, getAdapter, setAdapter, schemaAdapter } = require('../services/users.services')
const { generateToken, testPassword } = require('../utils/auth.utils')
const errors = require('../config/errors.internal')
const logger = require('../config/log.adapter')
const { access, timestampKeyRegEx } = require('../config/users.cfg')


class Users extends Model {
  constructor() { 
    super('_users', { schema: schemaAdapter, defaults: false })
    // { defaults: false } = ignore default values
    this.validTimestamps = Object.keys(this.schema).filter((k) => timestampKeyRegEx.test(k)).map((k) => k.match(timestampKeyRegEx)[1])
  }

  get(id, idKey, updateTimestamp = null) {
    if (updateTimestamp && !this.validTimestamps.includes(updateTimestamp)) logger.warn(`Ignoring request to update invalid '${updateTimestamp}Timestamp': ${id}`)

    return super.get(id, idKey || this.primaryId).then((user) => {
      if (!id && Array.isArray(user)) return user.map(getAdapter)
      if (!user) return user

      if (updateTimestamp && user[this.primaryId])
        super.update(user[this.primaryId], { [`${updateTimestamp}Time`]: new Date().toJSON() })

      return getAdapter(user)
    }
    )
  }

  async add(data) {
    const test = await this.validUsername(data.username)
    if (test) throw errors.badUsername(data.username.trim(), test)

    const newData = addAdapter(data, this.primaryId)
    if ((passwordAccess & newData.access) && !newData.key) throw errors.noData('password for GUI access')

    return super.add(newData)
  }

  async update(id, data) {
    const newData = setAdapter(data)
    
    if ((passwordAccess & newData.access) && !newData.key) {
      const current = await this.get(id)
      if (!current.password && !(passwordAccess & current.access)) throw errors.noData('password for GUI access')
    }
    return super.update(id, newData)
  }

  async remove(id, idKey = null) {
    if (!idKey) idKey = this.primaryId

    const admins = await this.custom(`SELECT ${idKey} FROM ${this.title} WHERE access & ?`, [access.admin])
    if (!admins) throw errors.unknownDb()

    if (admins.length < 2 && admins.find((u) => u[idKey] === id)) throw errors.deleteAdmin()
    return super.remove(id, idKey)
  }

  regenToken(id) {
    return super.update(id, { token: generateToken() })
  }

  async checkPassword(username, password, accessLevel) {
    const users = await this.count()
    if (!users)
      return this.add({ username, password, access: accessInt(accessLevel) })
        .then((id) => id && this.get(id))
        .then((data) => logger.info(' > Created initial user: '+data.username) || data)

    return super.get(username.toLowerCase(), 'username').then(testPassword(password, accessInt(accessLevel)))
  }

  validUsername(username) {
    if (/[^a-zA-Z0-9_-]/.test(username)) return 'Cannot contain spaces or symbols (Besides underscore & hyphen)'
    username = username.toLowerCase()
    return super.get().then((users) => users.every((user) => user.username !== username) ? 0 : 'Username already exists')
  }
}

module.exports = new Users()