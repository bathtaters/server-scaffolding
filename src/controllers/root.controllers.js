const Users = require('../models/_Users')
const { forwardOnAuth } = require('../middleware/auth.middleware')
const { access } = require('../config/constants/users.cfg')
const limits = require('../config/constants/validation.cfg').limits._users
const urls = require('../config/constants/urls.cfg').gui

exports.loginPage = [
  forwardOnAuth(urls.basic.prefix + urls.basic.home, access.gui),
  forwardOnAuth(urls.admin.prefix + urls.admin.home, access.admin),

  (req, res) => Users.count().then((isUser) => 
    res.render('login', {
      title: 'Login',
      hideNav: true,
      isUser,
      limits,
      failureMessage: req.flash('error'),
      postURL: urls.root.login,
    })
  ),
]

exports.splashPage = (req, res) => res.render('index')
