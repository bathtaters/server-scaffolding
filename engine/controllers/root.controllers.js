const Users = require('../models/Users')
const { forwardOnAuth } = require('../middleware/auth.middleware')
const { access } = require('../config/users.cfg')
const { isPm2 } = require('../config/meta')
const urls = require(require('../src.path').config+'urls.cfg').gui

exports.loginPage = [
  forwardOnAuth(urls.basic.prefix + urls.basic.home, access.gui),
  forwardOnAuth(urls.admin.prefix + urls.admin.home, access.admin),

  (req, res) => Users.count().then((isUser) => 
    res.render('login', {
      title: 'Login',
      hideNav: true,
      isUser: isPm2 || isUser,
      schema: Users.schema,
      failureMessage: req.flash('error'),
      postURL: urls.root.login,
      csrfToken: req.csrfToken && req.csrfToken(),
    })
  ),
]

exports.splashPage = (req, res) => res.render('index')
