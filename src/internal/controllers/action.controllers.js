const Users = require('../models/Users')
const { confirmPassword, guiFormAdapter } = require('../services/users.services')
const { modelActions, filterFormData } = require('../services/form.services')
const { settingsActions } = require('../services/settings.services')
const { login, logout } = require('../middleware/auth.middleware')
const { hasAccess } = require('../utils/users.utils')
const { access } = require('../config/users.cfg')
const { restartTimeout } = require('../config/env.cfg')
const errors = require('../config/errors.internal')
const urls = require('../../config/urls.cfg').gui

exports.login  = login(urls.basic.prefix + urls.basic.home, urls.root.login)
exports.logout = logout(urls.root.login)

exports.swap = require('./api.controllers').swap

exports.regenToken = (req,res,next) => Users.regenToken(req.body[Users.primaryId]).then(res.send).catch(next)

exports.form = function getFormController(Model, { redirectURL = '', formatData = (data) => data } = {}) {
  const formActions = modelActions(Model)

  return (req,res,next) => {
    let { action, queryString, ...formData } = filterFormData(req.body)

    if (!action || !Object.keys(formActions).includes(action))
      return next(errors.badAction(action))
    
    try { formData = formatData(formData, action, req.user) || formData }
    catch (err) { return next(err) }

    return formActions[action](formData)
      .then(() => res.redirect(redirectURL + (queryString || '') || `${urls.basic.prefix}${urls.basic.home}/${Model.title}${queryString || ''}`))
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


const restartParams = (req) => ({
  title: 'Restarting server...',
  seconds: restartTimeout,
  url: `${urls.admin.prefix}${urls.admin.home}`,
  user: req.user && req.user.username,
  isAdmin: req.user && hasAccess(req.user.access, access.admin),
})

exports.settingsForm = (req,res,next) => {
  const { action, queryString, env } = req.body
  if (!action || !Object.keys(settingsActions).includes(action)) return next(errors.badAction(action))

  if (action.toLowerCase() === 'update' && !env) return next(errors.noData('.ENV data'))

  return settingsActions[action](env)
    .then((delay) => delay ?
      res.render('delay', restartParams(req)) :
      res.redirect(`${urls.admin.prefix}${urls.admin.home}${queryString || ''}`)
    ).catch(next)
}
