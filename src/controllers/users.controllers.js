const Users = require('../models/_Users')
const { protectedPrefix, urls } = require('../config/meta')
const { access, tableFields, tooltips } = require('../config/constants/users.cfg')
const { login, logout, checkAuth } = require('../middleware/auth.middleware')
const { labels } = require('../services/form.services')
const { guiAdapter, confirmPassword, guiFormAdapter } = require('../services/users.services')
const { hasAccess } = require('../utils/users.utils')
const { form } = require('./gui.controllers')

exports.login  = login(`/${protectedPrefix}${urls.base}`, `/${protectedPrefix}${urls.login}`)
exports.logout = logout(`/${protectedPrefix}${urls.login}`)

const staticUserTableParams = {
  title: 'Users',
  tooltips,
  tableFields,
  idKey: Users.primaryId,
  buttons: labels,
  accessLevels: Object.keys(access),
  limits: Users.limits || {},
  defaults: Users.defaults || {},
  postURL: `/${protectedPrefix}${urls.users}form/`,
}
exports.userTable = [
  checkAuth(`/${protectedPrefix}${urls.login}`, 'admin'),
  async (req, res) => {
    const users = await Users.get().then(guiAdapter)
    return res.render('users', {
      ...staticUserTableParams,
      users,
      user: req.user.username,
      isAdmin: hasAccess(req.user.access, 'admin'),
    })
  },
]

exports.userProfile = [
  checkAuth(`/${protectedPrefix}${urls.login}`, 'gui'),
  (req, res) => res.render('profile', {
    ...staticUserTableParams,
    title: 'User Profile',
    user: req.user.username,
    userData: guiAdapter(req.user),
    buttons: labels.slice(1,3),
    isAdmin: hasAccess(req.user.access, 'admin'),
    postURL: `/${protectedPrefix}${urls.profile}form/`,
  }),
]


exports.adminForm = form(Users, {
  accessLevel: 'admin',
  formatData: confirmPassword,
  redirectURL: `/${protectedPrefix}${urls.users}`,
})

exports.userForm = form(Users, {
  accessLevel: 'gui',
  formatData: guiFormAdapter,
  redirectURL: `/${protectedPrefix}${urls.profile}`,
})


exports.regenToken = (req,res,next) => Users.regenToken(req.body[Users.primaryId]).then(res.send).catch(next)