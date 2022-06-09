const router = require('express').Router()
const controllers = require('../controllers/user.controllers')
const validate = require('../validators/user.validators')

router.post('/login',      validate.login, controllers.login)
router.get( '/logout',                     controllers.logout)
router.post('/form',       validate.form,  controllers.form)
router.post('/regenToken', validate.regen, controllers.regenToken)
router.get( '/',                           controllers.userTable)

module.exports = router