const Users = require('../models/_Users')
const logger = require('../config/log.adapter')
const { protectedPrefix, urls } = require('../config/meta')
const { access, tableFields } = require('../config/constants/users.cfg')
const { login, logout, checkAuth } = require('../middleware/auth.middleware')
const { labels } = require('../services/form.services')
const { formatUsers, formatFormData } = require('../services/users.services')
const { form } = require('./gui.controllers')

exports.login  = login(`/${protectedPrefix}${urls.base}`, `/${protectedPrefix}${urls.login}`)
exports.logout = logout(`/${protectedPrefix}${urls.login}`)


exports.userTable = [
  checkAuth(`/${protectedPrefix}${urls.login}`, 'admin'),
  async (req, res) => {
    const users = await Users.get().then(formatUsers)
    return res.render('users', {
      title: 'Users',
      user: req.user.username,
      postURL: `/${protectedPrefix}${urls.users}form/`,
      users,
      buttons: labels,
      accessLevels: Object.keys(access),
      tableFields,
    })
  },
]


exports.form = form(Users, {
  accessLevel: 'admin',
  mutateData: formatFormData,
  redirectURL: `/${protectedPrefix}${urls.users}`,
})


exports.regenToken = (req,res,next) => Users.regenID(req.body.id)
  .then((result) => {
    if (req.user.id !== req.body.id) return res.send(result)
    
    // When user is updating their own ID, reflect change in passport session
    return req.logIn(result, (err) => {
      if (err) return next(err)
      logger.info(' > Updated current user ID')
      res.send(result)
    })
  }).catch(next)