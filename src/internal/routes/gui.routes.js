const router = require('express').Router()
const models = require('../../models/_all')
const controllers = require('../controllers/gui.controllers')
const actions = require('../controllers/action.controllers')
const validate = require('../validators/gui.validators')
const { checkAuth } = require('../middleware/auth.middleware')
const { access } = require('../config/users.cfg')
const { basic, root } = require('../../config/urls.cfg').gui

router.use(checkAuth(root.login, access.gui))

router.get( basic.home,                           controllers.dbHome)
router.get( basic.user,                           controllers.userProfile)
router.post(basic.user+basic.form, validate.form, actions.userForm)

models.forEach((Model) => {
  router.get( `${basic.home}/${Model.title}`,              validate.page,        controllers.modelDb(Model))
  router.post(`${basic.home}/${Model.title}${basic.form}`, validate.all(Model),  actions.form(Model))
  router.post(`${basic.home}/${Model.title}${basic.swap}`, validate.swap(Model), actions.swap(Model))
})

module.exports = router