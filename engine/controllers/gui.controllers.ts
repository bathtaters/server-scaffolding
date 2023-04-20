import type { Middleware } from '../types/express.d'
import type { GuiOptions, ModelGuiBase } from '../types/controllers.d'
import { Role, anyAccess } from '../types/Users'
import { actions } from '../types/gui'

import { matchedData } from 'express-validator'
import Users from '../models/Users'
import { getTableFields, varName, formatGuiData } from '../utils/gui.utils'
import { guiAdapter } from '../services/users.services'
import { labelsByAccess, actionURLs } from '../utils/form.utils'
import { tableFields, tooltips, profileActions } from '../config/users.cfg'
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
  formatData = formatGuiData,
}: GuiOptions<any> = {}): Record<'model'|'find', Middleware> {

  const staticDbParams = {
    title: varName(Model.title),
    idKey: Model.primaryId,
    baseURL: `${urls.prefix}${urls.home}/${Model.url}`,
    swapURL: `${urls.prefix}${urls.home}/${Model.url}${urls.swap}`,
    submitURLs: actionURLs(`${urls.prefix}${urls.home}/${Model.url}${urls.form}/`),
    schema: Model.schema,
    tableFields: getTableFields(Model.schema, Model.primaryId),
    ...overrideDbParams,
  }

  return {
    model: (req, res, next) => Model.getPageData(matchedData(req), guiCfg.pageOptions).then(({ data, ...pageData}) => {
      const access = req.user?.access?.get(Model.title)

      return res.render(view, {
        ...staticDbParams,
        ...pageData,
        data: formatData(data, req.user),
        buttons: labelsByAccess(access),
        user: req.user?.username,
        isAdmin:  Role.map.admin.intersects(req.user?.role),
        csrfToken: req.csrfToken?.(),
        canRead: access?.intersects('read'),
        canWrite: access?.intersects('write'),
      })
    }).catch(next),

    find: async (req, res, next) => {
      try {
        const searchData = matchedData(req)
        const data = await Model.find(searchData, { partialMatch })

        const access = req.user?.access?.get(Model.title)

        return res.render(view, {
          ...staticDbParams,
          data: formatData(data, req.user),
          searchData: formatData(searchData, req.user, actions.find),
          buttons: labelsByAccess(access),
          user: req.user?.username,
          isAdmin: Role.map.admin.intersects(req.user?.role),
          csrfToken: req.csrfToken?.(),
          canRead: access?.intersects('read'),
          canWrite: access?.intersects('write'),
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

export const userProfile: Middleware = (req, res, next) =>
  !req.user ?
    next(noData('user'))
    :
    res.render('profile', {
      ...staticUserParams,
      user: req.user.username,
      userData: guiAdapter(req.user),
      isAdmin: Role.map.admin.intersects(req.user.role),
      csrfToken: req.csrfToken?.(),
    })
