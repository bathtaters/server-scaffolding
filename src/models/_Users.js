const Model = require('./AbstractModel')
const { defaultAccess, initialAccess } = require('../config/constants/users.cfg')
const { formatGet, formatNew } = require('../services/users.services')
const { generateToken, encodePassword, testPassword } = require('../utils/auth.utils')
const logger = require('../config/log.adapter')


class Users extends Model {
  constructor() {
    super('_users', {
      id: "TEXT PRIMARY KEY", // API Token
      username: "TEXT",
      access: "INTEGER",
      key: "TEXT",
      salt: "TEXT",
      urls: "TEXT",
    })
  }

  get(id) {
    return super.get(id).then((user) =>
      !id && Array.isArray(user) ? user.map(formatGet) :
      !user ? user : formatGet(user)
    )
  }

  async add({ username, password, access = defaultAccess, urls }) {
    const test = await this.validUsername(username)
    if (test) throw new Error(`Cannot add ${username.trim() || 'user'}: ${test}`)

    return super.add(formatNew({ username, password, access, urls }))
  }

  update(id, data) {
    if (data.password) data = { ...data, ...encodePassword(data.password) }
    return super.update(id, data)
  }

  regenID(currId) {
    const id = generateToken()
    return super.update(currId, { id }).then((ret) => ret ? ({ ...ret, id }) : ret)
  }

  async checkPassword(username, password) {
    const users = await this.count()
    if (!users)
      return this.add({ username, password, access: initialAccess })
        .then((id) => id && this.get(id))
        .then((data) => logger.info(' > Created initial user: '+data.username) || data)

    return super.get(username, 'username').then(testPassword(password))
  }

  validUsername(username) {
    if (/[^a-zA-Z0-9_-]/.test(username)) return 'Cannot contain spaces or symbols (Besides underscore & hyphen)'
    return super.get().then((users) => users.every((user) => user.username !== username) ? 0 : 'Username already exists')
  }
}

module.exports = new Users()