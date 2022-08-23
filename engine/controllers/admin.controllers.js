const { matchedData } = require('express-validator')
const Users = require('../models/Users')
const { modelDb } = require('./gui.controllers')
const { access, tableFields, tooltips, allModelsKey, models } = require('../config/users.cfg')
const { guiAdapter } = require('../services/users.services')
const { hasAccess } = require('../utils/users.utils')
const { getSettings, getForm, canUndo } = require('../services/settings.services')
const settingsActions = require('../services/settings.form')
const { logList, logFile } = require('../services/log.services')
const { getAllLevels } = require('../utils/log.utils')
const { actionURLs } = require('../utils/form.utils')
const { colors, maxLogLine, trimLogMessage } = require('../config/log.cfg')

const { config, modelsPath } = require('../src.path')
const urls = require(config+'urls.cfg').gui.admin

// USER TABLE
const modelsList = [require(modelsPath).map(({title}) => title).concat(allModelsKey), Object.keys(models)]
exports.userTable = modelDb(Users, { view: 'users', formatData: guiAdapter, overrideDbParams: {
  title: 'Users',
  tooltips,
  tableFields,
  modelsList,
  accessLevels: Object.keys(access),
  baseURL: urls.prefix + urls.user,
  regenURL: urls.prefix + urls.user + urls.token,
  submitURLs: actionURLs(`${urls.prefix}${urls.user}${urls.form}/`),
}})

// SETTINGS
exports.settings = async (req, res, next) => 
  res.render('settings', {
    title: 'Settings',
    settings: await getSettings(),
    formSettings: await getForm(),
    canUndo: canUndo(req.session),
    buttons: Object.keys(settingsActions),
    postURL: `${urls.prefix}${urls.home}${urls.form}`,
    user: req.user && req.user.username,
    isAdmin: req.user && hasAccess(req.user.access, access.admin),
    csrfToken: req.csrfToken && req.csrfToken(),
    userIP: req.ip,
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

exports.logView = (req, res, next) => {
  const title = matchedData(req).filename
  return logFile(title).then(({ log, prev, next }) => 
    res.render('logView', {
      title,
      log, prev, next,
      colors, maxLogLine, trimLogMessage,
      levels: getAllLevels(log),
      baseURL: logBaseURL + '/',
      user: req.user && req.user.username,
      isAdmin: req.user && hasAccess(req.user.access, access.admin),
    })
  ).catch(next)
}