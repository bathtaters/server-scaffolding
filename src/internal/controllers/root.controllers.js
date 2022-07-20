const Users = require('../models/Users')
const { forwardOnAuth } = require('../middleware/auth.middleware')
const { access } = require('../config/users.cfg')
const { isPm2 } = require('../../config/meta')
const limits = require('../../config/models.cfg').limits._users
const urls = require('../../config/urls.cfg').gui

exports.loginPage = [
  forwardOnAuth(urls.basic.prefix + urls.basic.home, access.gui),
  forwardOnAuth(urls.admin.prefix + urls.admin.home, access.admin),

  (req, res) => Users.count().then((isUser) => 
    res.render('login', {
      title: 'Login',
      hideNav: true,
      isUser: isPm2 || isUser,
      limits,
      failureMessage: req.flash('error'),
      postURL: urls.root.login,
    })
  ),
]

exports.splashPage = (req, res) => res.render('index')
