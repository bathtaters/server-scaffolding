const Users = require('../models/Users')
const { getTableFields, varName, formatGuiData } = require('../utils/gui.utils')
const { access, tableFields, tooltips } = require('../config/users.cfg')
const { guiAdapter } = require('../services/users.services')
const { hasAccess, hasModelAccess } = require('../utils/users.utils')
const { profileLabels, labelsByAccess, actionURLs } = require('../utils/form.utils')
const { pageOptions, actions } = require('../../config/gui.cfg')
const errors = require('../config/errors.internal')
const urls = require('../../config/urls.cfg').gui.basic

const models = require('../../models/_all').map(({title}) => title)

exports.dbHome = (req, res) => res.render('dbHome', {
  title: 'Home',
  user: req.user.username,
  isAdmin: hasAccess(req.user.access, access.admin),
  baseURL: urls.prefix + urls.home + '/',
  models: models.filter((modelName) => req.user && hasModelAccess(req.user.models, modelName)),
})

exports.modelDb = (Model, { view = 'dbModel', partialMatch = true, overrideDbParams = {}, formatData = formatGuiData } = {}) => {
  const staticDbParams = {
    title: varName(Model.title),
    idKey: Model.primaryId,
    baseURL: `${urls.prefix}${urls.home}/${Model.title}`,
    swapURL: `${urls.prefix}${urls.home}/${Model.title}${urls.swap}`,
    submitURLs: actionURLs(`${urls.prefix}${urls.home}/${Model.title}${urls.form}/`),
    schema: Model.schema,
    tableFields: getTableFields(Model.schema, Model.primaryId),
    ...overrideDbParams,
  }

  return {
    model: (req, res, next) => Model.getPaginationData(req.query, pageOptions).then(({ data, ...pageData}) => {
      const canRead  = req.user && hasModelAccess(req.user.models, Model.title, 'read')
      const canWrite = req.user && hasModelAccess(req.user.models, Model.title, 'write')

      return res.render(view, {
        ...staticDbParams,
        ...pageData,
        data: formatData(data, req.user),
        buttons: labelsByAccess([canRead ? 'read' : 'X', canWrite ? 'write' : 'X']),
        user: req.user && req.user.username,
        isAdmin:  req.user && hasAccess(req.user.access, access.admin),
        csrfToken: req.csrfToken && req.csrfToken(),
        canRead, canWrite,
      })
    }).catch(next),

    find: (req, res, next) => Model.find(req.query, partialMatch).then((data) => {
      const canRead  = req.user && hasModelAccess(req.user.models, Model.title, 'read')
      const canWrite = req.user && hasModelAccess(req.user.models, Model.title, 'write')

      return res.render(view, {
        ...staticDbParams,
        data: formatData(data, req.user),
        searchData: formatData(req.query, req.user, actions.find),
        buttons: labelsByAccess([canRead ? 'read' : 'X', canWrite ? 'write' : 'X']),
        user: req.user && req.user.username,
        isAdmin: req.user && hasAccess(req.user.access, access.admin),
        csrfToken: req.csrfToken && req.csrfToken(),
        canRead, canWrite,
      })
    }).catch(next),
  }
}

const staticUserParams = {
  title: 'Profile',
  tooltips,
  tableFields,
  idKey: Users.primaryId,
  buttons: profileLabels,
  schema: Users.schema,
  regenURL:   `${urls.prefix}${urls.user}${urls.token}`,
  submitURLs: actionURLs(`${urls.prefix}${urls.user}${urls.form}/`),
}
exports.userProfile = (req, res, next) => !req.user ? next(errors.noData('user')) :
  res.render('profile', {
    ...staticUserParams,
    user: req.user.username,
    userData: guiAdapter(req.user),
    isAdmin: hasAccess(req.user.access, access.admin),
    csrfToken: req.csrfToken && req.csrfToken(),
  })
