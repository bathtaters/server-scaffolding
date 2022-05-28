const router = require('express').Router()
const models = require('../models/all')
const validate = require('../validators/api.validators')
const controllers = require('../controllers/api.controllers')

router.get('/test', (_, res) => res.send({ data: 'success' }))

Object.entries(models).forEach(([name, Model]) => {
  router.post(  `/${name}/form`, validate.all(name),    controllers.form(Model))   // Form input

  router.post(  `/${name}/swap`, validate.swap(name),   controllers.swap(Model))   // Swap IDs
  router.post(  `/${name}`,      validate.all(name),    controllers.create(Model)) // Create
  router.get(   `/${name}`,                             controllers.read(Model))   // Read (all)
  router.get(   `/${name}/:id`,  validate.idOnly(name), controllers.read(Model))   // Read (one)
  router.put(   `/${name}/:id`,  validate.idAll(name),  controllers.update(Model)) // Update
  router.delete(`/${name}/:id`,  validate.idOnly(name), controllers.delete(Model)) // Delete
})

module.exports = router