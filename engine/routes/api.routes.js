const router = require('express').Router()
const validate = require('../validators/api.validators')
const controllers = require('../controllers/api.controllers')
const authenticate = require('../middleware/cors.middleware')

const { modelsPath, config } = require('../src.path')
const models = require(modelsPath)
const urls = require(config+'urls.cfg').api

models.forEach((Model) => {
  router.post(  `/${Model.title}`,                     authenticate(Model.title, 'write'), validate.all(Model),    controllers.create(Model)) // Create
  router.get(   `/${Model.title}`,                     authenticate(Model.title, 'read'),                          controllers.read(Model))   // Read (all)
  router.get(   `/${Model.title}/:${Model.primaryId}`, authenticate(Model.title, 'read'),  validate.idOnly(Model), controllers.read(Model))   // Read (one)
  router.put(   `/${Model.title}/:${Model.primaryId}`, authenticate(Model.title, 'write'), validate.idAll(Model),  controllers.update(Model)) // Update
  router.delete(`/${Model.title}/:${Model.primaryId}`, authenticate(Model.title, 'write'), validate.idOnly(Model), controllers.delete(Model)) // Delete
  router.post(  `/${Model.title}${urls.swap}`,         authenticate(Model.title, 'write'), validate.swap(Model),   controllers.swap(Model))   // Swap IDs
})

module.exports = router