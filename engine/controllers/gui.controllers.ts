import type { Middleware } from '../types/express.d'
import type { GuiOptions, ModelGuiBase } from '../types/controllers.d'
import { actions, type pageSelect } from '../types/gui'
import { Role, anyAccess } from '../types/Users'
import { adapterTypes } from '../types/Model'

import Users from '../models/Users'
import { getTableFields, varName } from '../utils/gui.utils'
import { toPartialMatch } from '../utils/model.utils'
import { getFormData, labelsByAccess, actionURLs } from '../utils/form.utils'
import { tableFields, tooltips, profileActions } from '../config/users.cfg'
import { getChildPath } from '../config/models.cfg'
import { noData } from '../config/errors.engine'

import { guiCfg, urlCfg, allModels } from '../src.import'

const urls = urlCfg.gui.basic
const models = allModels.map(({title, url}) => ({title, url}))


export const dbHome: Middleware = (req, res) => res.render('dbHome', {
  title: 'Home',
  user: req.user?.username,
  isAdmin: Role.map.admin.intersects(req.user?.role),
  baseURL: `${urls.prefix}${urls.home}/`,
  models: models
    .filter(({ title }) => req.user?.access?.intersects(anyAccess, title))
    .map(({ url }) => url),
})


export function modelDb<M extends ModelGuiBase>(Model: M, {
  view = 'dbModel',
  partialMatch = true,
  overrideDbParams = {},
}: GuiOptions<any> = {}): Record<'model'|'find', Middleware> {

  const staticDbParams = {
    title: varName(Model.isChildModel ? getChildPath(Model.title) : Model.title),
    idKey: Model.primaryId,
    baseURL: `${urls.prefix}${urls.home}/${Model.url}`,
    swapURL: `${urls.prefix}${urls.home}/${Model.url}${urls.swap}`,
    submitURLs: actionURLs(`${urls.prefix}${urls.home}/${Model.url}${urls.form}/`),
    schema: Model.schema,
    tableFields: getTableFields(Model.schema, Model.primaryId),
    ...overrideDbParams,
  }

  return {
    async model(req, res, next) {
      try {
        const pageData = await Model.getPageData(getFormData<typeof pageSelect>(req), guiCfg.pageOptions)

        const access = req.user?.access?.get(Model.title)

        return res.render(view, {
          ...staticDbParams,
          ...pageData,
          buttons:   labelsByAccess(access),
          user:      req.user?.username,
          isAdmin:   Role.map.admin.intersects(req.user?.role),
          csrfToken: req.csrfToken?.(),
          canRead:   access?.intersects('read'),
          canWrite:  access?.intersects('write'),
        })
      }
      catch (err) { next(err) }
    },

    async find(req, res, next) {
      try {
        const searchData = await Model.adaptData(adapterTypes.fromUI, getFormData(req))
        const data = await Model.find(partialMatch ? toPartialMatch(searchData) : searchData)
        const uiData = await Model.adaptDataArray(adapterTypes.toUI, data)

        const access = req.user?.access?.get(Model.title)

        return res.render(view, {
          ...staticDbParams,
          searchData,
          data:      uiData,
          buttons:   labelsByAccess(access),
          user:      req.user?.username,
          isAdmin:   Role.map.admin.intersects(req.user?.role),
          csrfToken: req.csrfToken?.(),
          canRead:   access?.intersects('read'),
          canWrite:  access?.intersects('write'),
        })
      } catch (err) { next(err) }
    },
  }
}


const staticUserParams = {
  title: 'Profile',
  tooltips,
  tableFields,
  idKey: Users.primaryId,
  buttons: profileActions.map((action) => actions[action]),
  schema: Users.schema,
  regenURL:   `${urls.prefix}${urls.user}${urls.token}`,
  submitURLs: actionURLs(`${urls.prefix}${urls.user}${urls.form}/`),
}

export const userProfile: Middleware = async (req, res, next) => {
  if (!req.user) return next(noData('user'))

  const userData = await Users.adaptData(adapterTypes.toUI, req.user)
  
  return res.render('profile', {
    ...staticUserParams,
    userData,
    user: req.user.username,
    isAdmin: Role.map.admin.intersects(req.user.role),
    csrfToken: req.csrfToken?.(),
  })
}
