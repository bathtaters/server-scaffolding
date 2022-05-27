const { getKeys, getSchema } = require('../utils/gui.utils')
const { apiVersion } = require('../config/meta')
const { labels } = require('../services/form.services')

exports.modelDashboard = (Model, view = 'model') =>
  async function dashboard(_, res, next) {
    
    return Model.get().then((data) => 
      res.render(view, {
        title: `Database: ${Model.title}`,
        schema: getSchema(Model.schema),
        keys: getKeys(Model.schema),
        postURL: `/api/v${apiVersion}/${Model.title}/form`,
        buttons: labels,
        data,
      })
    ).catch(next)
  }

