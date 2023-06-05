import type { UserDef, GetOptions, UpdateOptions, TimestampType, RoleType } from '../types/Users.d'
import type { AddSchemaOf, DBSchemaOf, PrimaryIDOf, SchemaOf, TypeOfID } from '../types/Model.d'
import type { UpdateData, WhereData } from '../types/db.d'
import { Role, timestamps } from '../types/Users'
import { adapterTypes } from '../types/Model'
import Model from './Model'
import logger from '../libs/log'
import { now } from '../libs/date'
import { generateToken } from '../libs/random'
import { userAdapters } from '../services/users.services'
import { projectedValue } from '../services/model.services'
import { testPassword, isLocked, isPastWindow } from '../utils/auth.utils'
import { whereClause, whereValues } from '../utils/db.utils'
import { getSqlParams } from '../utils/model.utils'
import { hasDupes, isIn } from '../utils/common.utils'
import { isPm2 } from '../config/meta'
import { definition, rateLimiter, passwordRoles, illegalUsername } from '../config/users.cfg'
import { badUsername, noData, usernameMessages, deleteAdmin, noID, noEntry } from '../config/errors.engine'

const title = '_users'

class User extends Model<UserDef, typeof title> {

  constructor() {
    super(title, definition, userAdapters)
    this.listeners.onCreate = this._checkNewUsers.bind(this)
    this.listeners.onUpdate = this._updateCb.bind(this)
    this.listeners.onDelete = this.throwLastAdmins.bind(this)
  }

  override async get<O extends GetOptions>
  (id: TypeOfID<UserDef, O['idKey']>, { timestamp, ignoreCounter, ...options } = {} as O)
  {
    const user = await super.get(id, options)
    if (user) await this._updateTimestamp(user, timestamp, ignoreCounter)
    return user
  }

  private async _getRaw<O extends GetOptions>
  (id: TypeOfID<UserDef, O['idKey']>, { timestamp, ignoreCounter, idKey, ...options } = {} as O)
  {
    const users = await super.find({ [idKey || this.primaryId]: id }, { ...options, raw: true, skipChildren: true })
    if (users.length < 1) return undefined

    await this._updateTimestamp(users[0], timestamp, ignoreCounter)
    return users[0]
  }
  
  tokenRegen(id: DBSchemaOf<UserDef>['id']) {
    return super.update(id, { token: generateToken() })
  }

  async checkPassword(username: SchemaOf<UserDef>['username'], password: string, role: RoleType) {
    if (!isPm2 && !(await this.count())) {
      const data = await this.addAndReturn([{ username, password, role }])
      logger.info(`Created initial user: ${data.username}`)
      return this.adaptData(adapterTypes.fromDB, data)
    }

    const data = await super.find({ username: username.toLowerCase() }, { raw: true, skipChildren: true })
    const result = await testPassword(data[0], password, role, this._passwordCb.bind(this))
    return 'fail' in result ? result : this.adaptData(adapterTypes.fromDB, result)
  }

  async checkToken(token: SchemaOf<UserDef>['token'], role: RoleType) {
    const user = await this._getRaw(token, { idKey: 'token', timestamp: timestamps.api })
    return !user ? 'NO_USER' :
      user.locked && !isPastWindow(user) ? 'USER_LOCKED' :
      !role.intersects(user.role) ? 'NO_ACCESS' :
        this.adaptData(adapterTypes.fromDB, user)
  }

  async areLastAdmins(where: WhereData<SchemaOf<UserDef>>) {
    const whereData = await this.adaptData(adapterTypes.toDB, where)
    const params = getSqlParams(this, whereData)

    const admins = await this.custom(
      `SELECT CASE ${
        whereClause(params, 'WHEN') || 'WHEN TRUE'} THEN 0 ELSE 1 END as remains FROM ${
        this.title} WHERE role & ?`,
      [...whereValues(params), Role.map.admin.value],
      true,
    ) as { remains: number }[]
    
    if (!admins.some(({ remains }) => remains === 0)) return false // User is not admin
    return !admins.filter(({ remains }) => remains).length
  }

  async throwLastAdmins(dataArray: DBSchemaOf<UserDef>[]) {
    const isLast = await this.areLastAdmins({
      id: { $in: dataArray.map(({ id }) => id).filter(Boolean) }
    })
    if (isLast) throw deleteAdmin()
  }

  async isInvalidUsername(username?: DBSchemaOf<UserDef>['username'], ignoreId?: DBSchemaOf<UserDef>['id']) {
    if (!username) return usernameMessages.missing
    if (illegalUsername.test(username)) return usernameMessages.illegal

    username = username.toLowerCase()

    const users = await super.find(undefined, { raw: true })
    const nameExists = users.some((user) =>
      user.id !== ignoreId && user.username === username
    )
    return nameExists && usernameMessages.exists
  }

  async throwInvalidUsername(username?: DBSchemaOf<UserDef>['username'], ignoreId?: DBSchemaOf<UserDef>['id']) {
    const errMsg = await this.isInvalidUsername(username, ignoreId)
    if (errMsg) throw badUsername(username, errMsg)
  }

  async incFailCount(user?: Partial<DBSchemaOf<UserDef>>, { reset, idKey, counter, ...options }: UpdateOptions = {}) {
    
    // Passing value for idKey forces a DB lookup
    if (idKey) {
      const id = user?.[idKey]
      if (!id) throw noID()
      
      user = await this._getRaw(id, { idKey })
      if (!user) throw noEntry(id)
    }

    else if (!user?.[this.primaryId]) throw noID()

    
    let newData: UpdateData<AddSchemaOf<UserDef>> =
      reset              ? { failCount: 0, failTime: null,       locked: false } :
      isPastWindow(user) ? { failCount: 1, failTime: new Date(), locked: false } : {
        failCount: { $inc: 1 },
        failTime: new Date(),
        locked: isLocked(user)
      }
    
    if (counter) newData[`${counter}Count`] = { $inc: 1 }
    
    return super.update(user[this.primaryId] as TypeOfID<UserDef>, newData, options)
  }



  // OVERRIDE HELPERS \\

  private async _updateTimestamp(
    userData: Pick<SchemaOf<UserDef,false> | DBSchemaOf<UserDef>, PrimaryIDOf<UserDef>>,
    timestamp?: TimestampType,
    ignoreCounter = false
  ) {
    if (!timestamp || !userData[this.primaryId])
      return false

    let data: UpdateData<AddSchemaOf<UserDef>> = { [`${timestamp}Time`]: now() }
    if (!ignoreCounter) data[`${timestamp}Count`] = { $inc: 1 }

    const { changed } = await super.update(userData[this.primaryId], data)
    return changed
  }


  private async _checkNewUsers(users: Omit<DBSchemaOf<UserDef>, 'id'|'token'>[]) {
    for (const user of users) {
      if (passwordRoles.intersects(user.role) && !user.password) throw noData('password for GUI access')
      await this.throwInvalidUsername(user.username)
    }

    if (users.length > 1) {
      const dupeIdx = hasDupes(users.map(({ username }) => username.toLowerCase()))
      if (dupeIdx) throw badUsername(users[dupeIdx - 1].username, usernameMessages.duplicate)
    }
  }

  private async _updateCb(newData: UpdateData<DBSchemaOf<UserDef>>, matchingData: DBSchemaOf<UserDef>[]) {
    const oldData = matchingData[0],
      newRole   = newData.role != null ? projectedValue<number | null | undefined>(oldData.role, newData.role) : oldData.role,
      newLocked = projectedValue(oldData.locked, newData.locked)
    
    if (newRole !== oldData.role) {
      // GUI Access requires password
      if (!oldData.password && !newData.password && passwordRoles.intersects(newRole))
        throw noData('password for GUI access')

      // Must have at least 1 admin
      if (Role.map.admin.intersects(oldData.role) && !Role.map.admin.intersects(newRole))
        await this.throwLastAdmins(matchingData)
    }
    
    // Usernames must be unique
    if (newData.username)
      await this.throwInvalidUsername(projectedValue(oldData.username, newData.username), oldData.id)

    // Auto-change fail props on Set/Reset lock
    if (oldData.locked && !newLocked) {
      newData.failCount = newData.failCount ?? 0
      newData.failTime  = newData.failTime  ?? null
    } else if (!oldData.locked && newLocked) {
      newData.failCount = newData.failCount ?? rateLimiter.maxFails
      newData.failTime  = newData.failTime  ?? now()
    }
  }

  private async _passwordCb(isMatch: boolean, userData: Partial<DBSchemaOf<UserDef>>) {
    await this.incFailCount(userData, {
      reset:   isMatch,
      counter: isMatch ? 'gui' : undefined
    })
  }
}


export default new User()

export type Users = User