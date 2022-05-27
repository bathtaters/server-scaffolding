const { getKeys, getSchema } = require('../utils/gui.utils')
const { apiVersion, protectedPrefix } = require('../config/meta')
const { labels } = require('../services/form.services')
const models = Object.keys(require('../models/all'))

exports.dashboardHome = (_, res) => res.render('index', {
  title: 'Database Dashboard',
  baseURL: `/${protectedPrefix}/dashboard/`,
  models
})

exports.modelDashboard = (Model, view = 'model') =>
  async function dashboard(_, res, next) {
    
    return Model.get().then((data) => 
      res.render(view, {
        title: `Table: ${Model.title}`,
        schema: getSchema(Model.schema),
        keys: getKeys(Model.schema),
        baseURL: `/${protectedPrefix}/dashboard/`,
        postURL: `/api/v${apiVersion}/${Model.title}/form`,
        buttons: labels,
        data,
      })
    ).catch(next)
  }

