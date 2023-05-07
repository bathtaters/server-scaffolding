import type { UsersDB, UsersUI, GetOptions, UpdateOptions, TimestampType, RoleType } from '../types/Users.d'
import type { SQLOptions } from '../types/Model.d'
import type { IfExistsBehavior, UpdateData, WhereData } from '../types/db.d'
import { Role, timestamps } from '../types/Users'
import { adapterTypes } from '../types/Model'
import Model from './Model'
import logger from '../libs/log'
import { now } from '../libs/date'
import { addAdapter, initAdapters } from '../services/users.services'
import { projectedValue, runAdapters } from '../services/model.services'
import { generateToken, testPassword, isLocked, isPastWindow } from '../utils/auth.utils'
import { whereClause, whereValues } from '../utils/db.utils'
import { getSqlParams } from '../utils/model.utils'
import { hasDupes, isIn } from '../utils/common.utils'
import { isPm2 } from '../config/meta'
import { definition, rateLimiter, passwordRoles, illegalUsername } from '../config/users.cfg'
import { badUsername, noData, usernameMessages, deleteAdmin, noID, noEntry } from '../config/errors.engine'


class User extends Model<UsersUI, UsersDB> {

  constructor() { 
    super('_users', definition)
    initAdapters(this.schema)
  }


  async get<ID extends User['primaryId'], O extends GetOptions<ID>>(
    id: UsersUI[ID], { timestamp, ignoreCounter, ...options }: O = {} as O
  ) {

    const user = await super.get(id, options)
    if (user) await this._updateTimestamp(user, timestamp, ignoreCounter)
    return user
  }

  private async _getRaw<ID extends User['primaryId']>
  (id: UsersUI[ID], { timestamp, ignoreCounter, idKey, ...options }: GetOptions = {}): Promise<Partial<UsersDB> | undefined> {

    const [user] = await super.find({ [idKey || this.primaryId]: id }, { ...options, raw: true, skipChildren: true })

    if (user) await this._updateTimestamp(user, timestamp, ignoreCounter)
    return user
  }

  async add(users: Omit<UsersUI,'id'|'token'>[], ifExists: IfExistsBehavior = 'default') {
    const userData = await this._addAdapter(users)
    return await super.add(userData, ifExists)
  }

  async addAndReturn(users: Omit<UsersUI,'id'|'token'>[], ifExists: IfExistsBehavior = 'default') {
    const userData = await this._addAdapter(users)
    return await super.addAndReturn(userData, ifExists)
  }

  private async _updateOVR<ID extends User['primaryId']>
  (id: UsersUI[ID], data: UpdateData<UsersUI>, options: SQLOptions<UsersDB> & { idKey?: ID } = {}) {
    const oldOnChange = options.onChange
    if (!oldOnChange) options.onChange = this._updateCb.bind(this)

    else options.onChange = async (update, matching) => {
      await oldOnChange(update, matching)
      return this._updateCb.call(this, update, matching)
    }

    return super.update(id, data, options)
  }
  override update: Model<UsersUI,UsersDB>['update'] = this._updateOVR.bind(this)

  
  async _removeOVR<ID extends User['primaryId']>(id: UsersUI[ID], idKey?: ID) {
    await this.throwLastAdmins({ [idKey || this.primaryId]: id })
    return super.remove(id, idKey)
  }
  override remove: Model<UsersUI,UsersDB>['remove'] = this._removeOVR.bind(this)


  regenToken(id: UsersDB['id']) {
    return super.update(id, { token: generateToken() })
  }

  async checkPassword(username: UsersUI['username'], password: string, role: RoleType) {
    if (!isPm2 && !(await this.count())) {
      const data = await this.addAndReturn([{ username, password, role }])
      logger.info(`Created initial user: ${data.username}`)
      return runAdapters(adapterTypes.get, data, this)
    }

    const data = await super.find({ username: username.toLowerCase() }, { raw: true, skipChildren: true })
    const result = await testPassword(data[0], password, role, this._passwordCb.bind(this))
    return 'fail' in result ? result : runAdapters(adapterTypes.get, result, this)
  }

  async checkToken(token: UsersUI['token'], role: RoleType) {
    const user = await this._getRaw(token, { idKey: 'token', timestamp: timestamps.api })
    return !user ? 'NO_USER' :
      user.locked && !isPastWindow(user) ? 'USER_LOCKED' :
      !role.intersects(user.role) ? 'NO_ACCESS' :
        runAdapters(adapterTypes.get, user, this)
  }

  async areLastAdmins(where: WhereData<UsersUI>) {
    const whereData = await runAdapters(adapterTypes.set, where, this)
    const params = getSqlParams(this, whereData)

    const admins = await this.custom(
      `SELECT CASE ${
        whereClause(params, 'WHEN') || 'WHEN TRUE'} THEN 0 ELSE 1 END as remains FROM ${
        this.title} WHERE role & ?`,
      [...whereValues(params), Role.map.admin.int],
      true,
    ) as { remains: number }[]
    
    return !admins.filter(({ remains }) => remains).length
  }

  async throwLastAdmins(where: WhereData<UsersUI>) {
    const isLast = await this.areLastAdmins(where)
    if (isLast) throw deleteAdmin()
  }

  async isInvalidUsername(username?: UsersDB['username'], ignoreId?: UsersDB['id']) {
    if (!username) return usernameMessages.missing
    if (illegalUsername.test(username)) return usernameMessages.illegal

    username = username.toLowerCase()

    const users = await super.find(undefined, { raw: true })
    const nameExists = users.some((user) =>
      user.id !== ignoreId && user.username === username
    )
    return nameExists && usernameMessages.exists
  }

  async throwInvalidUsername(username?: UsersDB['username'], ignoreId?: UsersDB['id']) {
    const errMsg = await this.isInvalidUsername(username, ignoreId)
    if (errMsg) throw badUsername(username, errMsg)
  }

  async incFailCount(userData?: Partial<UsersDB>, { reset, idKey, counter, ...options }: UpdateOptions = {}) {
    let user = userData
    if (user && idKey) {
      if (!(idKey in user)) throw noID()
      user = await this._getRaw(user[idKey], { idKey })
    }

    if (!user) throw userData ? noEntry(userData[idKey || this.primaryId]) : noID()
    
    let newData: UpdateData<UsersUI> =
      reset              ? { failCount: 0, failTime: undefined,  locked: false } : // TODO: Test that UNDEFINED works like NULL here
      isPastWindow(user) ? { failCount: 1, failTime: new Date(), locked: false } : {
        failCount: { $inc: 1 },
        failTime: new Date(),
        locked: isLocked(user)
      }
    
    if (counter) newData[`${counter}Count`] = { $inc: 1 }
    
    return super.update(user[this.primaryId], newData, options)
  }



  // OVERRIDE HELPERS \\

  private async _updateTimestamp(userData: Partial<UsersUI | UsersDB>, timestamp?: TimestampType, ignoreCounter = false) {
    if (!timestamp || !isIn(this.primaryId, userData) || !userData[this.primaryId])
      return false

    let data: UpdateData<UsersUI> = { [`${timestamp}Time`]: now() }
    if (!ignoreCounter) data[`${timestamp}Count`] = { $inc: 1 }

    const { success } = await super.update(userData[this.primaryId], data)
    return success
  }


  private async _addAdapter(users: Omit<UsersUI, 'id'|'token'>[]): Promise<UsersUI[]> {
    for (const user of users) {
      await this.throwInvalidUsername(user.username)
    }

    const userData = users.map((user) => {
      const newUser = addAdapter(user)
      if (passwordRoles.intersects(newUser.role) && !newUser.password)
        throw noData('password for GUI access')
      return newUser
    })

    if (userData.length > 1) {
      const dupeIdx = hasDupes(users.map(({ username }) => username.toLowerCase()))
      if (dupeIdx) throw badUsername(users[dupeIdx - 1].username, usernameMessages.duplicate)
    }

    return userData
  }

  private async _updateCb(newData: UpdateData<UsersDB>, matchingData: UsersDB[])  {
    const oldData = matchingData[0],    
      newRole   = newData.role   != null ? projectedValue(oldData.role,   newData.role)   : oldData.role,
      newLocked = projectedValue(oldData.locked, newData.locked)

    if (newRole !== oldData.role) {
      if (!oldData.password && !newData.password && passwordRoles.intersects(newRole))
        throw noData('password for GUI access')

      if (Role.map.admin.intersects(oldData.role) && !Role.map.admin.intersects(newRole))
        await this.throwLastAdmins({ id: { $in: matchingData.map(({ id }) => id) } })
    }
    
    if (newData.username)
      await this.throwInvalidUsername(projectedValue(oldData.username, newData.username), oldData.id)

    if (oldData.locked && !newLocked) {
      newData.failCount = 0
      newData.failTime = undefined // TODO: Test that UNDEFINED works like NULL here
    } else if (!oldData.locked && newLocked) {
      newData.failCount = rateLimiter.maxFails
      newData.failTime = now()
    }
  }

  private async _passwordCb(isMatch: boolean, userData: Partial<UsersDB>) {
    await this.incFailCount(userData, {
      reset:   isMatch,
      counter: isMatch ? 'gui' : undefined
    })
  }
}


export default new User()

export type Users = User