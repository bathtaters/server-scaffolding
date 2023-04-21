import type { Middleware } from '../types/express.d'
import { ModelAccess, Role } from '../types/Users'

import { matchedData } from 'express-validator'
import Users from '../models/Users'
import { modelDb } from './gui.controllers'
import { guiAdapter } from '../services/users.services'
import settingsActions from '../services/settings.form'
import { getSettings, getForm, canUndo } from '../services/settings.services'
import { getLogList, logFile } from '../services/log.services'
import { actionURLs } from '../utils/form.utils'
import { getAllLevels } from '../utils/log.utils'
import { tableFields, tooltips } from '../config/users.cfg'
import { colors, maxLogLine, trimLogMessage } from '../config/log.cfg'
import { urlCfg } from '../src.import'

const urls = urlCfg.gui.admin
const logBaseURL = `${urls.prefix}${urls.logs}`


// USER TABLE
export const userTable = modelDb(Users, {
  view: 'users',
  formatData: guiAdapter,
  overrideDbParams: {
    title: 'Users',
    tooltips,
    tableFields,
    accessList: [ ModelAccess.allKeys, ModelAccess.values ],
    roles:    [ ...Role.flags, ...Role.emptyList ],
    baseURL:  `${urls.prefix}${urls.user}`,
    regenURL: `${urls.prefix}${urls.user}${urls.token}`,
    submitURLs: actionURLs(`${urls.prefix}${urls.user}${urls.form}/`),
  }
})


// SETTINGS
export const settings: Middleware = async (req, res) =>
  res.render('settings', {
    title: 'Settings',
    settings: await getSettings(),
    formSettings: await getForm(),
    canUndo: canUndo(req.session),
    buttons: Object.keys(settingsActions),
    postURL: `${urls.prefix}${urls.home}${urls.form}`,
    user: req.user?.username,
    isAdmin: Role.map.admin.intersects(req.user?.role),
    csrfToken: req.csrfToken?.(),
    userIP: req.ip,
  })


// LOGS
export const logList: Middleware = (req, res, next) =>
  getLogList().then((logs) =>
    res.render('logList', {
      title: 'Logs',
      logs,
      baseURL: `${logBaseURL}/`,
      user: req.user?.username,
      isAdmin: Role.map.admin.intersects(req.user?.role),
    })
  ).catch(next)


export const logView: Middleware = (req, res, next) => {
  const title = matchedData(req).filename

  return logFile(title).then((logData) => 
    res.render('logView', {
      title,
      ...logData,
      colors, maxLogLine, trimLogMessage,
      levels: getAllLevels(logData.log),
      baseURL: `${logBaseURL}/`,
      user: req.user?.username,
      isAdmin: Role.map.admin.intersects(req.user?.role),
    })
  ).catch(next)
}