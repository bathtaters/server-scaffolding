const router = require('express').Router()
const controllers = require('../controllers/gui.controllers')
const models = require('../models/all')

Object.entries(models).forEach(([name, Model]) => {
  router.get(`/dashboard/${name}`, controllers.modelDashboard(Model))
})

module.exports = router