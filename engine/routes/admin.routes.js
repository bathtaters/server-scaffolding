const router = require('express').Router()
const controllers = require('../controllers/admin.controllers')
const actions = require('../controllers/action.controllers')
const validate = require('../validators/admin.validators')
const { checkAuth } = require('../middleware/auth.middleware')
const { access } = require('../config/users.cfg')

const { config } = require('../src.path')
const { actions: actionURL } = require(config+'gui.cfg')
const { admin, root } = require(config+'urls.cfg').gui

router.use(checkAuth(root.login, access.admin))

// User Table
router.get( admin.user,             validate.page,  controllers.userTable.model)
router.get( admin.user+admin.find,  validate.find,  controllers.userTable.find)
router.post(admin.user+admin.token, validate.token, actions.regenToken)
Object.values(actionURL).forEach((action) => {
  router.post(`${admin.user}${admin.form}/${action}`, validate.user(action), actions.adminForm(action))
})

// Logs/Settings
router.get(admin.home,                                   controllers.settings)
router.get(admin.logs,                                   controllers.logList)
router.get(`${admin.logs}/:filename`, validate.logs,     controllers.logView)
router.post(admin.home+admin.form,    validate.settings, actions.settingsForm)

module.exports = router