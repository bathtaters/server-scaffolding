const router = require('express').Router()
const controllers = require('../controllers/gui.controllers')
const swapControl = require('../controllers/api.controllers').swap
const swapValidate = require('../validators/api.validators').swap
const { urls } = require('../config/meta')

const models = require('../models/all')

Object.entries(models).forEach(([name, Model]) => {
  router.get( `${urls.base}${name}`,      controllers.modelDashboard(Model))
  // GUI API methods (Use GUI creds instead of API token)
  router.post(`${urls.base}${name}/form`, controllers.form(Model))
  router.post(`${urls.base}${name}/swap`, swapValidate(name), swapControl(Model))
})

router.get(urls.base, controllers.dashboardHome)
router.get(urls.login, controllers.loginPage)

module.exports = router