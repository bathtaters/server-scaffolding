const router = require('express').Router()
const controllers = require('../controllers/users.controllers')
const validate = require('../validators/users.validators')

router.get( '/',                             controllers.userTable)
router.post('/form',         validate.form,  controllers.adminForm)
router.post('/regenToken',   validate.regen, controllers.regenToken)

router.get( '/profile',                      controllers.userProfile)
router.post('/profile/form', validate.form,  controllers.userForm)

router.post('/login',        validate.login, controllers.login)
router.get( '/logout',                       controllers.logout)

module.exports = router