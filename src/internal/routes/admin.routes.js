const router = require('express').Router()
const controllers = require('../controllers/admin.controllers')
const actions = require('../controllers/action.controllers')
const validate = require('../validators/admin.validators')
const { checkAuth } = require('../middleware/auth.middleware')
const { access } = require('../config/users.cfg')
const { admin, root } = require('../../config/urls.cfg').gui

router.use(checkAuth(root.login, access.admin))

// User Table
router.get( admin.user,                       validate.page,      controllers.userTable.model)
router.get( admin.user+admin.find,            validate.find,      controllers.userTable.find)
router.post(admin.user+admin.token,           validate.token,     actions.regenToken)
router.post(admin.user+admin.form,            validate.form,      actions.adminForm)
router.post(admin.user+admin.form+admin.find, validate.formNoMin, actions.adminForm)

// Logs/Settings
router.get(admin.logs,              controllers.logList)
router.get(admin.logs+'/:filename', controllers.logView)
router.get(admin.home,              controllers.settings)
router.post(admin.home+admin.form,  validate.settings, actions.settingsForm)

module.exports = router