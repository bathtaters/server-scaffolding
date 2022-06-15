const Users = require('../models/_Users')
const { modelActions, filterFormData, labels } = require('../services/form.services')
const { checkAuth, forwardOnAuth } = require('../middleware/auth.middleware')
const { getTableFields, varName, getSchema } = require('../utils/gui.utils')
const { hasAccess } = require('../utils/users.utils')
const { access } = require('../config/constants/users.cfg')
const { protectedPrefix, urls } = require('../config/meta')
const errors = require('../config/constants/error.messages')
const limits = require('../config/constants/validation.cfg').limits._users

const models = Object.keys(require('../models/_all'))

exports.loginPage = [
  forwardOnAuth(`/${protectedPrefix}${urls.base}`, access.gui),
  async (req, res) => {
    const isUser = await Users.count()
    return res.render('login', {
      title: 'Backend Login',
      hideNav: true, isUser, limits,
      failureMessage: req.flash('error'),
      postURL: `/${protectedPrefix}${urls.users}login/`,
    })
  },
]

exports.dashboardHome = [
  checkAuth(`/${protectedPrefix}${urls.login}`, access.gui),
  (req, res) => res.render('dashboard', {
    title: 'Home',
    user: req.user.username,
    isAdmin: hasAccess(req.user.access, access.admin),
    models
  }),
]

exports.modelDashboard = (Model, view = 'model') => [
  checkAuth(`/${protectedPrefix}${urls.login}`, access.gui), 
  (req, res, next) => Model.get().then((data) => 
    res.render(view, {
      title: varName(Model.title),
      user: req.user.username,
      isAdmin: hasAccess(req.user.access, access.admin),
      postURL: `/${protectedPrefix}${urls.base}${Model.title}/form/`,
      idKey: Model.primaryId,
      data,
      buttons: labels,
      schema: getSchema(Model.schema, Model.primaryId),
      tableFields: getTableFields(Model.schema, Model.primaryId),
      limits: Model.limits || {},
      defaults: Model.defaults || {},
    })
  ).catch(next),
]


exports.error = (header) => (error, req, res, _) =>
  res.render('error', {
    title: '',
    user: req.user && req.user.username,
    isAdmin: req.user && hasAccess(req.user.access, access.admin),
    showStack: process.env.NODE_ENV === 'development',
    header, error,
  })


exports.form = (Model, { accessLevel = access.gui, redirectURL = '', formatData = (data) => data } = {}) => {
  const formActions = modelActions(Model)

  return [
    checkAuth(`/${protectedPrefix}${urls.login}`, accessLevel), 
    (req,res,next) => {
      let { action, ...formData } = filterFormData(req.body)

      if (!action || !Object.keys(formActions).includes(action))
        return next(errors.badAction(action))
      
      try { formData = formatData(formData, action, req.user) || formData }
      catch (err) { return next(err) }

      return formActions[action](formData)
        .then(() => res.redirect(redirectURL || `/${protectedPrefix}${urls.base}${Model.title}`))
        .catch(next)
    },
    exports.error(`${varName(Model.title)} Form Error`)
  ]
}

exports.swap = require('./api.controllers').swap