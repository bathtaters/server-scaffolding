const router = require('express').Router()
const models = require('../models/_all')
const controllers = require('../controllers/gui.controllers')
const validate = require('../validators/gui.validators')
const { urls } = require('../config/meta')

Object.entries(models).forEach(([name, Model]) => {
  router.post(`${urls.base}${name}/form`, validate.all(name),  controllers.form(Model))
  router.post(`${urls.base}${name}/swap`, validate.swap(name), controllers.swap(Model))
  router.get( `${urls.base}${name}`,                           controllers.modelDashboard(Model))
})

router.get(urls.base, controllers.dashboardHome)
router.get(urls.login, controllers.loginPage)

module.exports = router