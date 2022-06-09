const router = require('express').Router()
const controllers = require('../controllers/users.controllers')
const validate = require('../validators/users.validators')

router.post('/login',      validate.login, controllers.login)
router.get( '/logout',                     controllers.logout)
router.post('/form',       validate.form,  controllers.form)
router.post('/regenToken', validate.regen, controllers.regenToken)
router.get( '/',                           controllers.userTable)

module.exports = router