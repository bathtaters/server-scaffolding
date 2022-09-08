const Users = require('../models/Users')
const { forwardOnAuth } = require('../middleware/auth.middleware')
const { access } = require('../config/users.cfg')
const { isPm2 } = require('../config/meta')
const urls = require(require('../src.path').config+'urls.cfg').landingPage

exports.loginPage = [
  forwardOnAuth(urls.gui,   access.gui),
  forwardOnAuth(urls.admin, access.admin),

  (req, res) => Users.count().then((isUser) => 
    res.render('login', {
      title: 'Login',
      hideNav: true,
      isUser: isPm2 || isUser,
      schema: Users.schema,
      failureMessage: req.flash('error'),
      postURL: urls.logout,
      csrfToken: req.csrfToken && req.csrfToken(),
    })
  ),
]

exports.splashPage = (req, res) => res.render('index')
