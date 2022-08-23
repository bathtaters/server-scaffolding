const router = require('express').Router()
const controllers = require('../controllers/gui.controllers')
const actions = require('../controllers/action.controllers')
const validate = require('../validators/gui.validators')
const { checkAuth, checkModel } = require('../middleware/auth.middleware')
const { actionAccess } = require('../utils/form.utils')
const { access } = require('../config/users.cfg')

const { modelsPath, config } = require('../src.path')
const models = require(modelsPath)
const { basic, root } = require(config+'urls.cfg').gui
const { actions: actionURL } = require(config+'gui.cfg')

router.use(checkAuth(root.login, access.gui))

router.get( basic.home,                             controllers.dbHome)
router.get( basic.user,                             controllers.userProfile)
router.post(basic.user+basic.token, validate.token, actions.regenToken)
Object.values(actionURL).forEach((action) => {
  router.post(`${basic.user}${basic.form}/${action}`, validate.profile(action), actions.userForm(action))
})

const redir = basic.prefix + basic.home

models.forEach((Model) => { 
  const controller = controllers.modelDb(Model)
  const formHandler = actions.form(Model)

  router.get( `${basic.home}/${Model.title}`,                           checkModel(redir, Model.title),          validate.page,             controller.model)
  router.get( `${basic.home}/${Model.title}${basic.find}`,              checkModel(redir, Model.title, 'read'),  validate.find(Model),      controller.find)
  router.post(`${basic.home}/${Model.title}${basic.swap}`,              checkModel(null,  Model.title, 'write'), validate.swap(Model),      actions.swap(Model))
  Object.values(actionURL).forEach((action) => {
    router.post(`${basic.home}/${Model.title}${basic.form}/${action}`, checkModel(null,  Model.title, actionAccess(action)), validate.form(Model, action), formHandler(action))
  })
})

module.exports = router