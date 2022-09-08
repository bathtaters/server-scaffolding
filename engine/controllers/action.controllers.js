const { matchedData } = require('express-validator')
const Users = require('../models/Users')
const { adminFormAdapter, userFormAdapter } = require('../services/users.services')
const modelActions = require('../services/form.services')
const settingsActions = require('../services/settings.form')
const { login, logout } = require('../middleware/auth.middleware')
const { filterFormData, toQueryString } = require('../utils/form.utils')
const { hasAccess } = require('../utils/users.utils')
const { isBool } = require('../utils/model.utils')
const { access } = require('../config/users.cfg')
const { restartTimeout } = require('../config/settings.cfg')
const errors = require('../config/errors.engine')

const { config } = require('../src.path')
const { actions } = require(config+'gui.cfg')
const urls = require(config+'urls.cfg')

exports.login  = login(urls.landingPage.login, urls.landingPage.logout)
exports.logout = logout(urls.landingPage.logout)

exports.swap = require('./api.controllers').swap

exports.regenToken = (req,res,next) => Users.regenToken(matchedData(req)[Users.primaryId]).then((r) => res.send(r)).catch(next)

exports.form = function getFormController(Model, { redirectURL = '', formatData = (data) => data } = {}) {
  const formActions = modelActions(Model)
  const boolBase = Object.keys(Model.schema).reduce((bools, key) => 
    isBool(Model.schema[key]) ? Object.assign(bools, {[key]: false}) : bools
  , {})

  return (action) => (req,res,next) => {
    let { _action, _pageData, _searchMode, _csrf, ...formData } = filterFormData(matchedData(req), action === actions.find ? {} : boolBase)
    
    try {
      formData = formatData(formData, req.user, action) || formData
      _pageData = toQueryString(_pageData)
    }
    catch (err) { return next(err) }

    return formActions[action](formData).then((url) => res.redirect(
        (redirectURL || `${urls.gui.basic.prefix}${urls.gui.basic.home}/${Model.url}`) +
        (url || _pageData || '')
    )).catch(next)
  }
}

exports.adminForm = exports.form(Users, {
  formatData: adminFormAdapter,
  redirectURL: urls.gui.admin.prefix+urls.gui.admin.user,
})

exports.userForm = exports.form(Users, {
  formatData: userFormAdapter,
  redirectURL: urls.gui.basic.prefix+urls.gui.basic.user,
})


const restartParams = (req) => ({
  title: 'Restarting server...',
  seconds: restartTimeout,
  url: urls.landingPage.admin,
  user: req.user && req.user.username,
  isAdmin: req.user && hasAccess(req.user.access, access.admin),
})

exports.settingsForm = (req,res,next) => {
  let { _action, _pageData, ...settings } = matchedData(req)
  if (!_action || !Object.keys(settingsActions).includes(_action)) return next(errors.badAction(_action))

  if (_action.toLowerCase() === 'update' && !settings) return next(errors.noData('settings'))
  
  try { _pageData = toQueryString(_pageData) }
  catch (err) { return next(err) }

  return settingsActions[_action](settings, req.session)
    .then((restart) => {
      if (typeof restart !== 'function')
        return res.redirect(`${urls.landingPage.admin}${_pageData || ''}`)
      res.render('delay', restartParams(req))
      restart()
    }).catch(next)
}
