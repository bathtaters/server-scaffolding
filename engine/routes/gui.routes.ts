import { actions } from '../types/gui'
import { ModelAccess, Role } from '../types/Users'
import { Router } from 'express'
import { dbHome, userProfile, modelDb } from '../controllers/gui.controllers'
import { regenToken, userForm, form, swap } from '../controllers/action.controllers'
import * as validate from '../validators/gui.validators'
import { checkAuth, checkModel } from '../middleware/auth.middleware'
import { actionAccess } from '../utils/form.utils'
import { allModels, urlCfg } from '../src.import'

const router = Router()
const { basic, root } = urlCfg.gui
const redir = `${basic.prefix}${basic.home}`

router.use(checkAuth(root.login, Role.map.gui))

router.get( basic.home,                                    dbHome)
router.get( basic.user,                                    userProfile)
router.post(`${basic.user}${basic.token}`, validate.token, regenToken)

Object.values(actions).forEach((action) => {
  router.post(`${basic.user}${basic.form}/${action}`, validate.profile(action), userForm(action))
})

allModels.forEach((Model) => { 
  const controller = modelDb(Model)
  const formHandler = form(Model)

  router.get( `${basic.home}/${Model.url}`,              checkModel(redir, Model.title),                        validate.page,        controller.model)
  router.get( `${basic.home}/${Model.url}${basic.find}`, checkModel(redir, Model.title, ModelAccess.map.read),  validate.find(Model), controller.find)
  router.post(`${basic.home}/${Model.url}${basic.swap}`, checkModel(null,  Model.title, ModelAccess.map.write), validate.swap(Model), swap(Model))

  Object.values(actions).forEach((action) => {
    router.post(
      `${basic.home}/${Model.url}${basic.form}/${action}`,
      checkModel(null,  Model.title, actionAccess(action)),
      validate.form(Model, action),
      formHandler(action),
    )
  })
})

export default router