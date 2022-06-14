const Model = require('./_Model')
const { initialAccess } = require('../config/constants/users.cfg')
const { passwordAccess } = require('../utils/users.utils')
const { addAdapter, getAdapter, setAdapter, schemaAdapter } = require('../services/users.services')
const { generateToken, testPassword } = require('../utils/auth.utils')
const errors = require('../config/constants/error.messages')
const logger = require('../config/log.adapter')


class Users extends Model {
  constructor() { 
    super('_users', { schema: schemaAdapter, defaults: false })
    // { defaults: false } = ignore default values
  }

  get(id, idKey) {
    return super.get(id, idKey || this.primaryId).then((user) =>
      !id && Array.isArray(user) ? user.map(getAdapter) :
      !user ? user : getAdapter(user)
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

  regenToken(id) {
    return super.update(id, { token: generateToken() })
  }

  async checkPassword(username, password) {
    const users = await this.count()
    if (!users)
      return this.add({ username, password, access: initialAccess })
        .then((id) => id && this.get(id))
        .then((data) => logger.info(' > Created initial user: '+data.username) || data)

    return super.get(username.toLowerCase(), 'username').then(testPassword(password))
  }

  validUsername(username) {
    if (/[^a-zA-Z0-9_-]/.test(username)) return 'Cannot contain spaces or symbols (Besides underscore & hyphen)'
    username = username.toLowerCase()
    return super.get().then((users) => users.every((user) => user.username !== username) ? 0 : 'Username already exists')
  }
}

module.exports = new Users()