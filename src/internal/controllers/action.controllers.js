const Users = require('../models/Users')
const { adminFormAdapter, userFormAdapter } = require('../services/users.services')
const { modelActions, filterFormData } = require('../services/form.services')
const settingsActions = require('../services/settings.form')
const { login, logout } = require('../middleware/auth.middleware')
const { hasAccess } = require('../utils/users.utils')
const { deepUnescape } = require('../utils/validate.utils')
const { access } = require('../config/users.cfg')
const { restartTimeout } = require('../config/settings.cfg')
const errors = require('../config/errors.internal')
const urls = require('../../config/urls.cfg').gui

exports.login  = login(urls.basic.prefix + urls.basic.home, urls.root.login)
exports.logout = logout(urls.root.login)

exports.swap = require('./api.controllers').swap

exports.regenToken = (req,res,next) => Users.regenToken(req.body[Users.primaryId]).then((r) => res.send(r)).catch(next)

exports.form = function getFormController(Model, { redirectURL = '', formatData = (data) => data } = {}) {
  const formActions = modelActions(Model)

  return (req,res,next) => {
    let { action, queryString, searchMode, ...formData } = filterFormData(req.body, Model.boolFields)

    if (!action || !Object.keys(formActions).includes(action))
      return next(errors.badAction(action))
    
    try { formData = formatData(formData, req.user, action) || formData }
    catch (err) { return next(err) }

    return formActions[action](formData).then((url) => res.redirect(
        (redirectURL || `${urls.basic.prefix}${urls.basic.home}/${Model.title}`) +
        (!url && queryString ? deepUnescape(queryString) : url || '')
    )).catch(next)
  }
}

exports.adminForm = exports.form(Users, {
  formatData: adminFormAdapter,
  redirectURL: urls.admin.prefix+urls.admin.user,
})

exports.userForm = exports.form(Users, {
  formatData: userFormAdapter,
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
  const { action, queryString, ...settings } = req.body
  if (!action || !Object.keys(settingsActions).includes(action)) return next(errors.badAction(action))

  if (action.toLowerCase() === 'update' && !settings) return next(errors.noData('settings'))

  return settingsActions[action](settings, req.session)
    .then((restart) => {
      if (typeof restart !== 'function')
        return res.redirect(`${urls.admin.prefix}${urls.admin.home}${queryString ? deepUnescape(queryString) : ''}`)
      res.render('delay', restartParams(req))
      restart()
    }).catch(next)
}
