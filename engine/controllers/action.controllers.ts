import type { ModelActionBase } from '../types/controllers.d'
import type { Endware, Middleware, Request } from '../types/express.d'
import type { Feedback } from '../types/Model.d'
import type { UserDef } from '../types/Users.d'
import type { FormAction } from '../types/gui.d'
import type { EnvObject, SettingsDefinitions } from '../types/settings.d'
import { adapterTypes } from '../types/Model'
import { actions, metaField } from '../types/gui'
import { Role } from '../types/Users'

import Users from '../models/Users'
import { userFormCheck } from '../services/users.services'
import modelActions from '../services/form.services'
import settingsActions from '../services/settings.form'
import { login as authLogin, logout as authLogout } from '../middleware/auth.middleware'
import { getFormData, filterFormData, toQueryString } from '../utils/form.utils'
import { isBool } from '../utils/model.utils'
import { isIn, sanitizeObject } from '../utils/common.utils'
import { settingsKeys } from '../utils/settings.utils'
import { restartTimeout } from '../config/settings.cfg'
import { badAction, noData } from '../config/errors.engine'
import { urlCfg } from '../src.import'

export { swap } from './api.controllers'

export const login = authLogin(urlCfg.landingPage.login, urlCfg.landingPage.logout)

export const logout = authLogout(urlCfg.landingPage.logout)

export const tokenRegen: Endware<Feedback> = (req,res,next) =>
  Users.tokenRegen(getFormData<UserDef>(req)[Users.primaryId])
    .then((r) => res.send(r))
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
  
  return (action: FormAction): Middleware => async (req,res,next) => {
    let formData = filterFormData(getFormData(req), action === actions.find ? {} : boolBase)

    errorCheck?.(formData, req)
    
    let pageData = ''
    try {
      formData = await Model.adaptData(adapterTypes.fromUI, formData as any)
      pageData = toQueryString(formData[metaField.page])
    }
    catch (err) { return next(err) }

    return formActions[action](formData)
      .then((url) => res.redirect(`${redirectURL || defaultRedirect(Model.url)}${url || pageData}`))
      .catch(next)
  }
}


export const settingsForm: Middleware = (req,res,next) => {
  const data = getFormData<SettingsDefinitions>(req)

  const settings = sanitizeObject<EnvObject>(data, settingsKeys, false)
    , button = data[metaField.button]
    , page   = data[metaField.page]

  if (!button || !isIn(button, settingsActions))
    return next(badAction(button ?? undefined))

  if (button === actions.update && !Object.keys(settings).length)
    return next(noData('settings'))
  
  let qryStr = ''
  try { qryStr = toQueryString(page) }
  catch (err) { return next(err) }

  return settingsActions[button](settings, req.session)
    .then((restart) => {
      if (typeof restart !== 'function') return res.redirect(settingsRedirect(qryStr))

      res.render('delay', restartParams(req))
      return restart()
    })
    .catch(next)
}
