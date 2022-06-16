const Users = require('../models/_Users')
const { confirmPassword, guiFormAdapter } = require('../services/users.services')
const { modelActions, filterFormData } = require('../services/form.services')
const { login, logout } = require('../middleware/auth.middleware')
const errors = require('../config/constants/error.messages')
const urls = require('../config/meta').urls.gui

exports.login  = login(urls.basic.prefix + urls.basic.home, urls.root.login)
exports.logout = logout(urls.root.login)

exports.swap = require('./api.controllers').swap

exports.regenToken = (req,res,next) => Users.regenToken(req.body[Users.primaryId]).then(res.send).catch(next)

exports.form = function getFormController(Model, { redirectURL = '', formatData = (data) => data } = {}) {
  const formActions = modelActions(Model)

  return (req,res,next) => {
    let { action, ...formData } = filterFormData(req.body)

    if (!action || !Object.keys(formActions).includes(action))
      return next(errors.badAction(action))
    
    try { formData = formatData(formData, action, req.user) || formData }
    catch (err) { return next(err) }

    return formActions[action](formData)
      .then(() => res.redirect(redirectURL || `${urls.basic.prefix}${urls.basic.home}/${Model.title}`))
      .catch(next)
  }
}

exports.adminForm = exports.form(Users, {
  formatData: confirmPassword,
  redirectURL: urls.admin.prefix+urls.admin.user,
})

exports.userForm = exports.form(Users, {
  formatData: guiFormAdapter,
  redirectURL: urls.basic.prefix+urls.basic.user,
})