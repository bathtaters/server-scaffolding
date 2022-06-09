const router = require('express').Router()
const controllers = require('../controllers/gui.controllers')
const models = require('../models/all')

Object.entries(models).forEach(([name, Model]) => {
  router.get( `/dashboard/${name}`,      controllers.modelDashboard(Model))
  router.post(`/dashboard/${name}/form`, controllers.form(Model))
})

router.get('/dashboard', controllers.dashboardHome)
router.get('/login', controllers.loginPage)

module.exports = router