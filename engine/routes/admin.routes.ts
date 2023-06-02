import { actions } from '../types/gui'
import { Role } from '../types/Users'
import { Router } from 'express'
import { userTable, settings, logList, logView } from '../controllers/admin.controllers'
import { tokenRegen, adminForm, settingsForm } from '../controllers/action.controllers'
import * as valid from '../validators/admin.validators'
import { checkAuth } from '../middleware/auth.middleware'
import { urlCfg } from '../src.import'

const router = Router()
const { admin, root } = urlCfg.gui

router.use(checkAuth(root.login, Role.map.admin))

// User Table
router.get( admin.user,             valid.page,  userTable.model)
router.get( admin.user+admin.find,  valid.find,  userTable.find)
router.post(admin.user+admin.token, valid.token, tokenRegen)

Object.values(actions).forEach((action) => {
  router.post(`${admin.user}${admin.form}/${action}`, valid.user(action), adminForm(action))
})

// Logs/Settings
router.get(admin.home,                                settings)
router.get(admin.logs,                                logList)
router.get(`${admin.logs}/:filename`, valid.logs,     logView)
router.post(admin.home+admin.form,    valid.settings, settingsForm)

export default router