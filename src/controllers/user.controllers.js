const Users = require('../models/_Users')
const { protectedPrefix, urls } = require('../config/meta')
const { access, tableFields } = require('../config/constants/users.cfg')
const { login, logout, checkAuth } = require('../middleware/auth.middleware')
const { labels } = require('../services/form.services')
const { guiAdapter, confirmPassword } = require('../services/users.services')
const { form } = require('./gui.controllers')

exports.login  = login(`/${protectedPrefix}${urls.base}`, `/${protectedPrefix}${urls.login}`)
exports.logout = logout(`/${protectedPrefix}${urls.login}`)


exports.userTable = [
  checkAuth(`/${protectedPrefix}${urls.login}`, 'admin'),
  async (req, res) => {
    const users = await Users.get().then(guiAdapter)
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
  mutateData: confirmPassword,
  redirectURL: `/${protectedPrefix}${urls.users}`,
})


exports.regenToken = (req,res,next) => Users.regenToken(req.body.id).then(res.send).catch(next)