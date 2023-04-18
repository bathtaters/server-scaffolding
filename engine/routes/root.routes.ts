import { Router } from 'express'
import { loginPage, splashPage } from '../controllers/root.controllers'
import { logout, login } from '../controllers/action.controllers'
import * as validate from '../validators/root.validators'
import { loginLimiter } from '../middleware/rateLimit.middleware'
import { urlCfg } from '../src.import'

const router = Router()
const { root, splashRedirect } = urlCfg.gui

router.use([root.login, root.logout], loginLimiter)

router.get( root.logout, logout)
router.post(root.login,  validate.login, login)
router.get( root.login,  loginPage)

router.get('/', splashPage)
router.get(splashRedirect, (_,res) => res.redirect('/'))

export default router