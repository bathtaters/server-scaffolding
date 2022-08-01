const router = require('express').Router()
const models = require('../../models/_all')
const controllers = require('../controllers/gui.controllers')
const actions = require('../controllers/action.controllers')
const validate = require('../validators/gui.validators')
const { checkAuth, checkModel } = require('../middleware/auth.middleware')
const { formRW } = require('../utils/gui.utils')
const { access } = require('../config/users.cfg')
const { basic, root } = require('../../config/urls.cfg').gui

router.use(checkAuth(root.login, access.gui))

router.get( basic.home,                               controllers.dbHome)
router.get( basic.user,                               controllers.userProfile)
router.post(basic.user+basic.form,  validate.profile, actions.userForm)
router.post(basic.user+basic.token, validate.token,   actions.regenToken)

const redir = basic.prefix + basic.home

models.forEach((Model) => { 
  const controller = controllers.modelDb(Model)

  router.get( `${basic.home}/${Model.title}`,                           checkModel(redir, Model.title),          validate.page,             controller.model)
  router.get( `${basic.home}/${Model.title}${basic.find}`,              checkModel(redir, Model.title, 'read'),  validate.find(Model),      controller.find)
  router.post(`${basic.home}/${Model.title}${basic.swap}`,              checkModel(null,  Model.title, 'write'), validate.swap(Model),      actions.swap(Model))
  router.post(`${basic.home}/${Model.title}${basic.form}`,              checkModel(null,  Model.title, formRW),  validate.form(Model),      actions.form(Model))
  router.post(`${basic.home}/${Model.title}${basic.form}${basic.find}`, checkModel(redir, Model.title, 'read'),  validate.formNoMin(Model), actions.form(Model))
})

module.exports = router