import type { Middleware } from '../types/express.d'
import { access } from '../types/Users'
import Users from '../models/Users'
import { forwardOnAuth } from '../middleware/auth.middleware'
import { isPm2 } from '../config/meta'
import { urlCfg } from '../src.import'


export const loginPage: Middleware[] = [
  forwardOnAuth(urlCfg.landingPage.gui,   access.gui  ),
  forwardOnAuth(urlCfg.landingPage.admin, access.admin),

  (req, res) => Users.count().then((isUser) => 
    res.render('login', {
      title: 'Login',
      hideNav: true,
      isUser: isPm2 || !!isUser,
      schema: Users.schema,
      failureMessage: req.flash('error'),
      postURL: urlCfg.landingPage.logout,
      csrfToken: req.csrfToken?.(),
    })
  ),
]


export const splashPage: Middleware = urlCfg.overrideSplash ?
  (_, res) => res.redirect(301, urlCfg.overrideSplash as string) :
  (_, res) => res.render('index')
