const router = require('express').Router()
const models = require('../models/all')
const validate = require('../validators/api.validators')
const controllers = require('../controllers/api.controllers')

router.get('/test', (_, res) => res.send({ data: 'success' }))

Object.entries(models).forEach(([name, Model]) => {
  router.post(`/${name}/form`, validate.all(name), controllers.modelForm(Model))
})

module.exports = router