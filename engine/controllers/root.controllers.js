const Users = require('../models/Users')
const { forwardOnAuth } = require('../middleware/auth.middleware')
const { access } = require('../config/users.cfg')
const { isPm2 } = require('../config/meta')
const { landingPage, overrideSplash } = require(require('../src.path').config+'urls.cfg')

exports.loginPage = [
  forwardOnAuth(landingPage.gui,   access.gui),
  forwardOnAuth(landingPage.admin, access.admin),

  (req, res) => Users.count().then((isUser) => 
    res.render('login', {
      title: 'Login',
      hideNav: true,
      isUser: isPm2 || isUser,
      schema: Users.schema,
      failureMessage: req.flash('error'),
      postURL: landingPage.logout,
      csrfToken: req.csrfToken && req.csrfToken(),
    })
  ),
]

exports.splashPage = overrideSplash ? (req,res) => res.redirect(301, overrideSplash) : (req, res) => res.render('index')
