const router = require('express').Router()
const controllers = require('../controllers/user.controllers')

router.post('/login',   controllers.login)
router.get( '/logout',  controllers.logout)

router.post('/form',    controllers.form)
router.post('/regenID', controllers.regenToken)
router.get( '/',        controllers.userTable)

module.exports = router