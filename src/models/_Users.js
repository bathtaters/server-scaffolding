const Model = require('./AbstractModel')
const { initialAccess } = require('../config/constants/users.cfg')
const { addAdapter, getAdapter, setAdapter } = require('../services/users.services')
const { generateToken, testPassword } = require('../utils/auth.utils')
const logger = require('../config/log.adapter')


class Users extends Model {
  constructor() {
    super('_users', {
      id: "TEXT PRIMARY KEY", // API Token
      token: "TEXT",
      username: "TEXT",
      access: "INTEGER",
      key: "TEXT",
      salt: "TEXT",
      cors: "TEXT",
    })
  }

  get(id, idKey = 'id') {
    return super.get(id, idKey).then((user) =>
      !id && Array.isArray(user) ? user.map(getAdapter) :
      !user ? user : getAdapter(user)
    )
  }

  async add(data) {
    const test = await this.validUsername(data.username)
    if (test) throw new Error(`Cannot add ${data.username.trim() || 'user'}: ${test}`)

    return super.add(addAdapter(data))
  }

  update(id, data) {
    return super.update(id, setAdapter(data))
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
    return super.get().then((users) => users.every((user) => user.username !== username) ? 0 : 'Username already exists')
  }
}

module.exports = new Users()