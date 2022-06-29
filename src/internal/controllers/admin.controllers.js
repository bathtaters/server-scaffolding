const Users = require('../models/Users')
const { modelDb } = require('./gui.controllers')
const { access, tableFields, tooltips, allModelsKey, models } = require('../config/users.cfg')
const envTooltips = require('../config/env.cfg').tooltips
const { guiAdapter } = require('../services/users.services')
const { hasAccess } = require('../utils/users.utils')
const { getEnv, getForm, canUndo, settingsActions } = require('../services/settings.services')
const { logList, logFile } = require('../services/log.services')
const { getAllLevels } = require('../utils/log.utils')
const urls = require('../../config/urls.cfg').gui.admin
const { colors, maxLogLine, trimLogMessage } = require('../config/log.cfg')

// USER TABLE
const modelsList = [require('../../models/_all').map(({title}) => title).concat(allModelsKey), Object.keys(models)]
exports.userTable = modelDb(Users, { view: 'users', formatData: guiAdapter, overrideDbParams: {
  title: 'Users',
  tooltips,
  tableFields,
  modelsList,
  schema: [],
  accessLevels: Object.keys(access),
  baseURL: urls.prefix + urls.user,
  postURL: urls.prefix + urls.user + urls.form,
  submitURLs: [urls.prefix + urls.user + urls.form + urls.find],
}})

// SETTINGS
exports.settings = (req, res, next) =>
  res.render('settings', {
    title: 'Settings',
    env: getEnv(),
    formSettings: getForm(),
    tooltips: envTooltips,
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

exports.logView = (req, res, next) => logFile(req.params.filename).then(({ log, prev, next }) => 
  res.render('logView', {
    title: req.params.filename,
    log, prev, next,
    colors, maxLogLine, trimLogMessage,
    levels: getAllLevels(log),
    baseURL: logBaseURL + '/',
    user: req.user && req.user.username,
    isAdmin: req.user && hasAccess(req.user.access, access.admin),
  })
).catch(next)