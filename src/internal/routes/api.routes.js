const router = require('express').Router()
const models = require('../../models/_all')
const validate = require('../validators/api.validators')
const controllers = require('../controllers/api.controllers')
const corsMiddleware = require('../middleware/cors.middleware')
const urls = require('../../config/urls.cfg').api

router.use(corsMiddleware)

models.forEach((Model) => {
  router.post(  `/${Model.title}${urls.swap}`, validate.swap(Model),   controllers.swap(Model))   // Swap IDs
  router.post(  `/${Model.title}`,             validate.all(Model),    controllers.create(Model)) // Create
  router.get(   `/${Model.title}`,                                     controllers.read(Model))   // Read (all)
  router.get(   `/${Model.title}/:id`,         validate.idOnly(Model), controllers.read(Model))   // Read (one)
  router.put(   `/${Model.title}/:id`,         validate.idAll(Model),  controllers.update(Model)) // Update
  router.delete(`/${Model.title}/:id`,         validate.idOnly(Model), controllers.delete(Model)) // Delete
})

module.exports = router