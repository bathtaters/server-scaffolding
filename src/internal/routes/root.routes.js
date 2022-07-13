const router = require('express').Router()
const controllers = require('../controllers/root.controllers')
const actions = require('../controllers/action.controllers')
const validate = require('../validators/root.validators')
const { root, splashRedirect } = require('../../config/urls.cfg').gui

router.get( root.logout,                 actions.logout)
router.post(root.login,  validate.login, actions.login)
router.get( root.login,                  controllers.loginPage)

router.get('/',            controllers.splashPage)
router.get(splashRedirect, (req,res) => res.redirect('/'))

module.exports = router