import type { UsersDB, UsersUI, GetOptions, UpdateOptions, AccessType, TimestampType } from '../types/Users'
import type { SQLOptions } from '../types/Model'
import type { IfExistsBehavior } from '../types/db'
import Model from './Model'
import logger from '../libs/log'
import { now } from '../libs/date'
import { passwordAccess, accessInt, hasAccess } from '../utils/users.access'
import { addAdapter, initAdapters } from '../services/users.services'
import { rateLimiter, illegalUsername, definition } from '../config/users.cfg'
import { generateToken, testPassword, isLocked, isPastWindow } from '../utils/auth.utils'
import { incrementCb } from '../utils/model.utils'
import { hasDupes, isIn } from '../utils/common.utils'
import { access } from '../types/Users'
import { isPm2 } from '../config/meta'
import { badUsername, noData, usernameMessages, deleteAdmin, badKey, noID, noEntry } from '../config/errors.engine'


class Users extends Model<UsersUI, UsersDB> {

  constructor() { 
    super('_users', definition)
    initAdapters(this.schema)
  }


  async get<ID extends keyof (UsersUI | UsersDB) & string>(
    id: UsersUI[ID], { timestamp, ignoreCounter, ...options }: GetOptions = {}
  ): Promise<UsersUI | undefined> {

    const user = await super.get(id, options)
    if (user) this._updateTimestamp(user, timestamp, ignoreCounter)
    return user
  }

  async getRaw<ID extends keyof (UsersUI | UsersDB) & string>(
    id: UsersUI[ID], { timestamp, ignoreCounter, ...options }: GetOptions = {}
  ): Promise<Partial<UsersDB> | undefined> {

    const user = await super.findBaseRaw({ [options.idKey || this.primaryId]: id }, options).then((users) => users[0])
    if (user) this._updateTimestamp(user, timestamp, ignoreCounter)
    return user
  }

  async add(users: Omit<UsersUI,'id'|'token'>[], ifExists: IfExistsBehavior = 'default') {
    return this._addAdapter(users).then((userData) => super.add(userData, ifExists))
  }

  async addAndReturn(users: Omit<UsersUI,'id'|'token'>[], ifExists: IfExistsBehavior = 'default') {
    return this._addAdapter(users).then((userData) => super.addAndReturn(userData, ifExists))
  }

  async batchUpdate(where: Partial<UsersUI>, data: Partial<UsersUI>, options: SQLOptions<UsersDB> = {}) {
    const oldOnChange = options.onChange
    if (!oldOnChange) options.onChange = this._updateCb

    else options.onChange = async (update, matching) => {
      await oldOnChange(update, matching)
      return this._updateCb(update, matching)
    }
    return super.batchUpdate(where, data, options)
  }

  async batchRemove<ID extends keyof UsersDB & string>(ids: UsersDB[ID][], idKey?: ID) {
    await this.throwLastAdmins(ids, idKey)
    return super.batchRemove(ids, idKey)
  }

  regenToken(id: UsersDB['id']) {
    return super.update(id, { token: generateToken() })
  }

  async checkPassword(username: UsersUI['username'], password: string, accessLevel: AccessType) {
    if (!isPm2 && !(await this.count())) {
      const data = await this.addAndReturn([{ username, password, access: accessInt(accessLevel) }])
      logger.info(`Created initial user: ${data.username}`)
      return data
    }

    const data = await super.findBaseRaw({ username: username.toLowerCase() })
    return testPassword(data[0], password, accessInt(accessLevel), this._passwordCb)
  }

  async checkToken(token: UsersUI['token'], accessLevel: AccessType) {
    return this.getRaw(token, { idKey: 'token', timestamp: 'api' })
      .then((user) =>
        !user ? 'NOTFOUND' :
        (user.locked && !isPastWindow(user)) || !hasAccess(user.access, accessInt(accessLevel)) ? false : user
      )
  }

  async areLastAdmins<ID extends keyof UsersDB & string>(ids: UsersDB[ID][], idKey = this.primaryId as ID) {
    if (!Object.keys(this.schema).includes(idKey))
      throw badKey(idKey, this.title)

    const admins: Pick<UsersDB, ID>[] = await this.custom(
      `SELECT ${idKey} FROM ${this.title} WHERE access & ?`,
      [access.admin]
    )
    
    return !admins.filter((user) => !ids.includes(user[idKey])).length
  }

  async throwLastAdmins<ID extends keyof UsersDB & string>(ids: UsersDB[ID][], idKey?: ID) {
    return this.areLastAdmins(ids, idKey).then((isLast) => { if (isLast) throw deleteAdmin() })
  }

  async isInvalidUsername(username?: UsersDB['username'], ignoreId?: UsersDB['id']) {
    if (!username) return usernameMessages.missing
    if (illegalUsername.test(username)) return usernameMessages.illegal

    username = username.toLowerCase()

    const users = await super.findRaw()
    const nameExists = users.every((user) =>
      user.id === ignoreId || user.username !== username
    )
    return nameExists && usernameMessages.exists
  }

  async throwInvalidUsername(username?: UsersDB['username'], ignoreId?: UsersDB['id']) {
    return this.isInvalidUsername(username, ignoreId)
      .then((errMsg) => { if (errMsg) throw badUsername(username, errMsg) })
  }

  async incFailCount(userData?: Partial<UsersDB>, { reset, idKey, onChange }: UpdateOptions = {}) {
    let user = userData
    if (user && idKey) {
      if (!(idKey in user)) throw noID()
      user = await this.getRaw(user[idKey], { idKey })
    }

    if (!user) throw userData ? noEntry(userData[idKey || this.primaryId]) : noID()
    
    const newData: Partial<UsersUI> =
      reset              ? { failCount: 0, failTime: undefined,  locked: false } : // TODO: Test that UNDEFINED works like NULL here
      isPastWindow(user) ? { failCount: 1, failTime: new Date(), locked: false } : {
        failCount: (user.failCount || 0) + 1,
        failTime: new Date(),
        locked: isLocked(user)
      }
    
    return super.update(user[this.primaryId], newData, { onChange })
  }



  // OVERRIDE HELPERS \\

  private async _updateTimestamp(userData: Partial<UsersUI | UsersDB>, timestamp?: TimestampType, ignoreCounter = false) {
    if (!timestamp || !isIn(this.primaryId, userData) || !userData[this.primaryId])
      return false

    const counter: Partial<UsersUI> = ignoreCounter ? {} : {
      [`${timestamp}Count`]: (userData[`${timestamp}Count`] || 0) + 1
    }
    return super.update(userData[this.primaryId], {
      [`${timestamp}Time`]: now(),
      ...counter,
    }).then(({ success }) => success)
  }


  private async _addAdapter(users: Omit<UsersUI, 'id'|'token'>[]): Promise<UsersUI[]> {
    for (const user of users) {
      await this.throwInvalidUsername(user.username)
    }

    const userData = users.map((user) => {
      const newUser = addAdapter(user)
      if ((passwordAccess & accessInt(newUser.access)) && !newUser.password)
        throw noData('password for GUI access')
      return newUser
    })

    if (userData.length > 1) {
      const dupeIdx = hasDupes(users.map(({ username }) => username.toLowerCase()))
      if (dupeIdx) throw badUsername(users[dupeIdx - 1].username, usernameMessages.duplicate)
    }

    return userData
  }

  private async _updateCb(newData: Partial<UsersDB>, matchingData: UsersDB[])  {
    const oldData = matchingData[0]

    if ('access' in newData && newData.access !== oldData.access) {
      if (!oldData.pwkey && !newData.pwkey && (passwordAccess & accessInt(newData.access)))
        throw noData('password for GUI access')

      if (accessInt(oldData.access) & access.admin && !(accessInt(newData.access) & access.admin))
        await this.throwLastAdmins(matchingData.map((u) => u.id), 'id')
    }
    
    if (newData.username)
      await this.throwInvalidUsername(newData.username, oldData.id)

    if (oldData.locked && !newData.locked) {
      newData.failCount = 0
      newData.failTime = undefined // TODO: Test that UNDEFINED works like NULL here
    } else if (!oldData.locked && newData.locked) {
      newData.failCount = rateLimiter.maxFails
      newData.failTime = now()
    }
  }

  private async _passwordCb(isMatch: boolean, userData: Partial<UsersDB>) {
    await this.incFailCount(userData, {
      reset: isMatch,
      onChange: isMatch ? incrementCb('guiCount') : undefined
    })
  }
}


export default new Users()