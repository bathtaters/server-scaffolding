const router = require('express').Router()
const controllers = require('../controllers/users.controllers')
const validate = require('../validators/users.validators')

const urls = require('../config/constants/urls.cfg')
const profileUrl = urls.profile.replace(urls.users, '')

router.get( '/',                                  controllers.userTable)
router.post('/form',              validate.form,  controllers.adminForm)
router.post('/regenToken',        validate.regen, controllers.regenToken)

router.get(`/${profileUrl}`,                      controllers.userProfile)
router.post(`/${profileUrl}form`, validate.form,  controllers.userForm)

router.post('/login',             validate.login, controllers.login)
router.get( '/logout',                            controllers.logout)

module.exports = router