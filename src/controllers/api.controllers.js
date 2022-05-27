const { protectedPrefix } = require('../config/meta')
const { modelActions } = require('../services/form.services')

exports.modelForm = (Model) => {
  const formActions = modelActions(Model)

  return function form(req,res,next) {
    const { action, ...formData } = { ...req.body }

    if (!action || !Object.keys(formActions).includes(action))
      return next(new Error(`${action ? 'Invalid' : 'No'} action specified.`))

    return formActions[action](formData)
      .then(() => res.redirect(`/${protectedPrefix}/dashboard/${Model.title}`))
      .catch(next)
  }
}
