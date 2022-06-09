const Users = require('../models/_Users')
const { modelActions, filterFormData, labels } = require('../services/form.services')
const { checkAuth, forwardOnAuth } = require('../middleware/auth.middleware')
const { getTableFields, varName, getSchema } = require('../utils/gui.utils')
const { hasAccess } = require('../utils/access.utils')
const { protectedPrefix, urls } = require('../config/meta')

const models = Object.keys(require('../models/all'))

exports.loginPage = [
  forwardOnAuth(`/${protectedPrefix}${urls.base}`, 'gui'),
  async (_, res) => {
    const isUser = await Users.count()
    return res.render('login', {
      title: 'Backend Login',
      isHome: true, isUser,
      postURL: `/${protectedPrefix}${urls.users}login/`,
    })
  },
]

exports.dashboardHome = [
  checkAuth(`/${protectedPrefix}${urls.login}`, 'gui'),
  (req, res) => res.render('index', {
    title: 'Home',
    user: req.user.username,
    isAdmin: hasAccess(req.user.access, 'admin'),
    isHome: true,
    models
  }),
]

exports.modelDashboard = (Model, view = 'model') => [
  checkAuth(`/${protectedPrefix}${urls.login}`, 'gui'), 
  (req, res, next) => Model.get().then((data) => 
    res.render(view, {
      title: varName(Model.title),
      user: req.user.username,
      isAdmin: hasAccess(req.user.access, 'admin'),
      postURL: `/${protectedPrefix}${urls.base}${Model.title}/form/`,
      data,
      buttons: labels,
      schema: getSchema(Model.schema),
      tableFields: getTableFields(Model.schema),
    })
  ).catch(next),
]


exports.error = (header) => (error, req, res, _) =>
  res.render('error', {
    title: '',
    user: req.user && req.user.username,
    isAdmin: req.user && hasAccess(req.user.access, 'admin'),
    header, error,
  })


exports.form = (Model, { accessLevel = 'gui', redirectURL = '', mutateData = () => {} } = {}) => {
  const formActions = modelActions(Model)

  return [
    checkAuth(`/${protectedPrefix}${urls.login}`, accessLevel), 
    (req,res,next) => {
      const { action, ...formData } = filterFormData(req.body)

      if (!action || !Object.keys(formActions).includes(action))
        return next(new Error(`${action ? 'Invalid' : 'No'} action specified.`))
      
      try { mutateData(formData, action) }
      catch (err) { return next(err) }

      return formActions[action](formData)
        .then(() => res.redirect(redirectURL || `/${protectedPrefix}${urls.base}${Model.title}`))
        .catch(next)
    },
    exports.error(`${varName(Model.title)} Form Error`)
  ]
}