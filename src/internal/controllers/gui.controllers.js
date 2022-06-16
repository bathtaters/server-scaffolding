const Users = require('../models/Users')
const { getTableFields, varName, getSchema } = require('../utils/gui.utils')
const { access, tableFields, tooltips } = require('../config/users.cfg')
const { guiAdapter } = require('../services/users.services')
const { hasAccess } = require('../utils/users.utils')
const { labels } = require('../services/form.services')
const errors = require('../../config/error.messages')
const urls = require('../../config/urls.cfg').gui.basic

const models = require('../../models/_all').map(({title}) => title)

exports.dbHome = (req, res) => res.render('dbHome', {
  title: 'Home',
  user: req.user.username,
  isAdmin: hasAccess(req.user.access, access.admin),
  baseURL: urls.prefix + urls.home + '/',
  models
})

exports.modelDb = (Model, view = 'dbModel') => {
  const staticDbParams = {
    title: varName(Model.title),
    idKey: Model.primaryId,
    postURL: `${urls.prefix}${urls.home}/${Model.title}${urls.form}`,
    buttons: labels,
    schema: getSchema(Model.schema, Model.primaryId),
    tableFields: getTableFields(Model.schema, Model.primaryId),
    limits: Model.limits || {},
    defaults: Model.defaults || {},
  }
  return (req, res, next) => Model.get().then((data) => 
    res.render(view, {
      ...staticDbParams,
      user: req.user && req.user.username,
      isAdmin: req.user && hasAccess(req.user.access, access.admin),
      data,
    })
  ).catch(next)
}

const staticUserParams = {
  title: 'Profile',
  tooltips,
  tableFields,
  idKey: Users.primaryId,
  buttons: labels.slice(1,3),
  limits: Users.limits || {},
  defaults: Users.defaults || {},
  postURL: urls.prefix + urls.user + urls.form,
}
exports.userProfile = (req, res, next) => !req.user ? next(errors.noData('user')) :
  res.render('profile', {
    ...staticUserParams,
    user: req.user.username,
    userData: guiAdapter(req.user),
    isAdmin: hasAccess(req.user.access, access.admin),
  })
