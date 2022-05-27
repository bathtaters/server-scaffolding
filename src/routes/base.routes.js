const router = require('express').Router()
const validate = require('../validators/base.validators')
const controller = require('../controllers/base.controllers')

// Example route (Leave off .catch() if not async)
router.get('/sample', validate.sample, (req, res, next) => controller.sample(req, res, next).catch(next))

module.exports = router