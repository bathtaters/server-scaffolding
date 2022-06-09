const router = require('express').Router()
const controllers = require('../controllers/user.controllers')

router.post('/login',   controllers.login)
router.get( '/logout',  controllers.logout)

// GUI API methods (Use GUI creds instead of API token)
router.post('/form',    controllers.form)
router.post('/regenToken', controllers.regenToken)

router.get( '/',        controllers.userTable)

module.exports = router