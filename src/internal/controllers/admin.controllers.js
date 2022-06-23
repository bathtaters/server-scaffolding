const Users = require('../models/Users')
const { access, tableFields, tooltips } = require('../config/users.cfg')
const { guiAdapter } = require('../services/users.services')
const { hasAccess } = require('../utils/users.utils')
const { labels } = require('../services/form.services')
const { getEnv, canUndo, settingsActions } = require('../services/settings.services')
const { logList, logFile } = require('../services/log.services')
const { getAllLevels } = require('../utils/log.utils')
const urls = require('../../config/urls.cfg').gui.admin
const { pageOptions } = require('../../config/gui.cfg')
const { colors } = require('../config/log.cfg')

// USER TABLE
const staticUserParams = {
  title: 'Users',
  tooltips,
  tableFields,
  idKey: Users.primaryId,
  buttons: labels,
  accessLevels: Object.keys(access),
  limits: Users.limits || {},
  defaults: Users.defaults || {},
  postURL: urls.prefix + urls.user + urls.form,
}
exports.userTable = (req, res, next) => Users.getPaginationData(req.query, pageOptions).then(({ data, ...pageData }) => 
  res.render('users', {
    ...staticUserParams,
    ...pageData,
    users: guiAdapter(data),
    user: req.user && req.user.username,
    isAdmin: req.user && hasAccess(req.user.access, access.admin),
  })
).catch(next)

// SETTINGS
exports.settings = (req, res, next) =>
  res.render('settings', {
    title: 'Settings',
    env: getEnv(),
    canUndo: canUndo(),
    buttons: Object.keys(settingsActions),
    postURL: urls.prefix + urls.home + urls.form,
    user: req.user && req.user.username,
    isAdmin: req.user && hasAccess(req.user.access, access.admin),
  })

// LOGS
const logBaseURL = urls.prefix + urls.logs
exports.logList = (req, res, next) => logList().then((logs) => 
  res.render('logList', {
    title: 'Logs',
    logs,
    baseURL: logBaseURL + '/',
    user: req.user && req.user.username,
    isAdmin: req.user && hasAccess(req.user.access, access.admin),
  })
).catch(next)

exports.logView = (req, res, next) => logFile(req.params.filename).then((log) => 
  res.render('logView', {
    title: req.params.filename,
    log, colors,
    levels: getAllLevels(log),
    baseURL: logBaseURL,
    user: req.user && req.user.username,
    isAdmin: req.user && hasAccess(req.user.access, access.admin),
  })
).catch(next)