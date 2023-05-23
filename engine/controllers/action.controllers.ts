import type { ModelActionBase } from '../types/controllers.d'
import type { Middleware, Request } from '../types/express.d'
import type { ProfileActions } from '../types/gui.d'
import { adapterTypes } from '../types/Model'
import { actions } from '../types/gui'
import { Role } from '../types/Users'

import { matchedData } from 'express-validator'
import Users from '../models/Users'
import { userFormCheck } from '../services/users.services'
import modelActions from '../services/form.services'
import settingsActions from '../services/settings.form'
import { login as authLogin, logout as authLogout } from '../middleware/auth.middleware'
import { filterFormData, toQueryString } from '../utils/form.utils'
import { isBool } from '../utils/model.utils'
import { isIn } from '../utils/common.utils'
import { restartTimeout } from '../config/settings.cfg'
import { badAction, noData } from '../config/errors.engine'
import { urlCfg } from '../src.import'

export { swap } from './api.controllers'

export const login = authLogin(urlCfg.landingPage.login, urlCfg.landingPage.logout)

export const logout = authLogout(urlCfg.landingPage.logout)

export const regenToken: Middleware = (req,res,next) =>
  Users.regenToken(matchedData(req)[Users.primaryId])
    .then((r: any) => res.send(r))
    .catch(next)

export const adminForm = form(Users, `${urlCfg.gui.admin.prefix}${urlCfg.gui.admin.user}`)

export const userForm =  form(Users, `${urlCfg.gui.basic.prefix}${urlCfg.gui.basic.user}`, userFormCheck)



const defaultRedirect = (modelUrl: string) => `${urlCfg.gui.basic.prefix}${urlCfg.gui.basic.home}/${modelUrl}`
const settingsRedirect = (qryStr: string) => `${urlCfg.landingPage.admin}${qryStr}`

const restartParams = (req: Request) => ({
  title: 'Restarting server...',
  seconds: restartTimeout,
  url: urlCfg.landingPage.admin,
  user: req.user?.username,
  isAdmin: Role.map.admin.intersects(req.user?.role),
})


export function form(Model: ModelActionBase, redirectURL?: string, errorCheck?: (data: any, req: Express.Request) => any) {

  const formActions = modelActions(Model)

  const boolBase = Object.keys(Model.schema).reduce(
    (bools, key) => isBool(Model.schema[key]) ? { ...bools, [key]: false } : bools,
    {} as Record<string,any>
  )
  
  // TODO -- Add type to 'matchedData'?
  return (action: ProfileActions): Middleware => (req,res,next) => {
    let formData = filterFormData(matchedData(req), action === actions.find ? {} : boolBase)

    errorCheck?.(formData, req)
    
    let pageData = ''
    try {
      formData = Model.adaptData(adapterTypes.fromUI, formData as any)
      pageData = toQueryString(formData._pageData)
    }
    catch (err) { return next(err) }

    return formActions[action](formData)
      .then((url) => res.redirect(`${redirectURL || defaultRedirect(Model.url)}${url || pageData}`))
      .catch(next)
  }
}


export const settingsForm: Middleware = (req,res,next) => {
  // TODO -- Add type to 'matchedData'?
  let { _action, _pageData, ...settings } = matchedData(req)

  if (!_action || !isIn(_action, settingsActions)) return next(badAction(_action))

  if (_action === actions.update && !Object.keys(settings).length) return next(noData('settings'))
  
  let qryStr = ''
  try { qryStr = toQueryString(_pageData) }
  catch (err) { return next(err) }

  return settingsActions[_action](settings, req.session)
    .then((restart) => {
      if (typeof restart !== 'function') return res.redirect(settingsRedirect(qryStr))

      res.render('delay', restartParams(req))
      return restart()
    })
    .catch(next)
}
