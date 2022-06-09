const router = require('express').Router()
const { urls } = require('../config/meta')
const controllers = require('../controllers/gui.controllers')
const models = require('../models/all')

Object.entries(models).forEach(([name, Model]) => {
  router.get( `${urls.base}${name}`,      controllers.modelDashboard(Model))
  router.post(`${urls.base}${name}/form`, controllers.form(Model))
})

router.get(urls.base, controllers.dashboardHome)
router.get(urls.login, controllers.loginPage)

module.exports = router