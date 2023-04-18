import type { ModelActionBase, FormOptions } from '../types/controllers.d'
import type { Middleware, Request } from '../types/express.d'
import type { ProfileActions } from '../types/gui.d'
import { actions } from '../types/gui'
import { access } from '../types/Users'

import { matchedData } from 'express-validator'
import Users from '../models/Users'
import { adminFormAdapter, userFormAdapter } from '../services/users.services'
import modelActions from '../services/form.services'
import settingsActions from '../services/settings.form'
import { login as authLogin, logout as authLogout } from '../middleware/auth.middleware'
import { filterFormData, toQueryString } from '../utils/form.utils'
import { hasAccess } from '../utils/users.access'
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

export const adminForm = form(Users, {
  formatData: adminFormAdapter,
  redirectURL: `${urlCfg.gui.admin.prefix}${urlCfg.gui.admin.user}`,
})

export const userForm = form(Users, {
  formatData: userFormAdapter,
  redirectURL: `${urlCfg.gui.basic.prefix}${urlCfg.gui.basic.user}`,
})



const defaultRedirect = (modelUrl: string) => `${urlCfg.gui.basic.prefix}${urlCfg.gui.basic.home}/${modelUrl}`
const settingsRedirect = (qryStr: string) => `${urlCfg.landingPage.admin}${qryStr}`

const restartParams = (req: Request) => ({
  title: 'Restarting server...',
  seconds: restartTimeout,
  url: urlCfg.landingPage.admin,
  user: req.user?.username,
  isAdmin: hasAccess(req.user?.access, access.admin),
})


export function form<D extends Record<string,any>, M extends ModelActionBase>
  (Model: M, { redirectURL, formatData }: FormOptions<D> = {})
{

  const formActions = modelActions(Model)

  const boolBase = Object.keys(Model.schema).reduce(
    (bools, key) => isBool(Model.schema[key]) ? { ...bools, [key]: false } : bools,
    {} as Record<string,any>
  )
  
  // TODO -- Add type to 'matchedData'? -- formData should be type D
  return (action: ProfileActions): Middleware => (req,res,next) => {
    let { _action, _pageData, _searchMode, _csrf, ...formData } = filterFormData(
      matchedData(req),
      action === actions.find ? {} : boolBase
    )
    
    try {
      formData = formatData?.(formData as any, req.user, action) ?? formData
      _pageData = toQueryString(_pageData)
    }
    catch (err) { return next(err) }

    return formActions[action](formData)
      .then((url) => res.redirect(`${redirectURL || defaultRedirect(Model.url)}${url || _pageData || ''}`))
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
