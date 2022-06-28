const Users = require('../models/Users')
const { getTableFields, varName, getSchema } = require('../utils/gui.utils')
const { access, tableFields, tooltips } = require('../config/users.cfg')
const { guiAdapter } = require('../services/users.services')
const { hasAccess, hasModelAccess } = require('../utils/users.utils')
const { labels } = require('../services/form.services')
const errors = require('../config/errors.internal')
const { pageOptions } = require('../../config/gui.cfg')
const urls = require('../../config/urls.cfg').gui.basic

const models = require('../../models/_all').map(({title}) => title)

exports.dbHome = (req, res) => res.render('dbHome', {
  title: 'Home',
  user: req.user.username,
  isAdmin: hasAccess(req.user.access, access.admin),
  baseURL: urls.prefix + urls.home + '/',
  models: models.filter((modelName) => hasModelAccess(req.user, modelName)),
})

exports.modelDb = (Model, { view = 'dbModel', partialMatch = true, overrideDbParams = {}, formatData = (data) => data } = {}) => {
  const staticDbParams = {
    title: varName(Model.title),
    idKey: Model.primaryId,
    baseURL: `${urls.prefix}${urls.home}/${Model.title}`,
    postURL: `${urls.prefix}${urls.home}/${Model.title}${urls.form}`,
    submitURLs: [`${urls.prefix}${urls.home}/${Model.title}${urls.form}${urls.find}`],
    buttons: labels,
    schema: getSchema(Model.schema, Model.primaryId),
    tableFields: getTableFields(Model.schema, Model.primaryId),
    limits: Model.limits || {},
    defaults: Model.defaults || {},
    ...overrideDbParams,
  }

  return {
    model: (req, res, next) => Model.getPaginationData(req.query, pageOptions).then(({ data, ...pageData}) => 
      res.render(view, {
        ...staticDbParams,
        ...pageData,
        data: formatData(data, req.user),
        user: req.user && req.user.username,
        isAdmin: req.user && hasAccess(req.user.access, access.admin),
      })
    ).catch(next),

    find: (req, res, next) => Model.find(req.query, partialMatch).then((data) => 
      res.render(view, {
        ...staticDbParams,
        data: formatData(data, req.user),
        searchData: formatData(req.query, req.user, labels[0]),
        user: req.user && req.user.username,
        isAdmin: req.user && hasAccess(req.user.access, access.admin),
      })
    ).catch(next),
  }
}

const staticUserParams = {
  title: 'Profile',
  tooltips,
  tableFields,
  idKey: Users.primaryId,
  buttons: labels.slice(2,4),
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
