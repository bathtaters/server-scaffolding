const { protectedPrefix } = require('../config/meta')
const { modelActions, filterFormData } = require('../services/form.services')

exports.form = (Model) => {
  const formActions = modelActions(Model)

  return function form(req,res,next) {
    const { action, ...formData } = filterFormData(req.body)

    if (!action || !Object.keys(formActions).includes(action))
      return next(new Error(`${action ? 'Invalid' : 'No'} action specified.`))

    return formActions[action](formData)
      .then(() => res.redirect(`/${protectedPrefix}/dashboard/${Model.title}`))
      .catch(next)
  }
}

const TEMP_ID = -11
exports.swap = (Model) => async function (req,res,next) {
  if (req.body.id == null || req.body.swap == null) return next(new Error(`Missing IDs to swap.`))
  
  const entryA = await Model.get(req.body.id).then((r) => r && r.id).catch(next)
  const entryB = await Model.get(req.body.swap).then((r) => r && r.id).catch(next)
  if (!entryA || !entryB) return next(new Error(`No entry exists at IDs ${req.body.id} or ${req.body.swap}.`))

  await Model.update(entryA,  { id: TEMP_ID }).catch(next)
  await Model.update(entryB,  { id: entryA  }).catch(next)
  await Model.update(TEMP_ID, { id: entryB  }).catch(next)
  return res.send({ success: true })
}

exports.create = (Model) => function (req,res,next) {
  if (!req.body || !Object.keys(req.body).length) return next(new Error(`No data provided.`))
  return Model.add(req.body).then((id) => res.send({ id })).catch(next)
}

exports.read = (Model) => function (req,res,next) {
  return Model.get(req.params.id).then((data) =>
    data ? res.send(data) : next(new Error(`No entry exists at ID ${req.params.id || '<All>'}.`))
  ).catch(next)
}

exports.update = (Model) => async function (req,res,next) {
  if (req.params.id == null) return next(new Error(`No ID provided.`))
  if (!req.body || !Object.keys(req.body).length) return next(new Error(`No data provided.`))
  
  const entry = await Model.get(req.params.id).catch(next)
  if (!entry || !entry.id) return next(new Error(`No entry exists at ID ${req.params.id}.`))

  return Model.update(entry.id, req.body).then(() => res.send({ success: true })).catch(next)
}

exports.delete = (Model) => async function (req,res,next) {
  if (req.params.id == null) return next(new Error(`No ID provided.`))

  const entry = await Model.get(req.params.id).catch(next)
  if (!entry || !entry.id) return next(new Error(`No entry exists at ID ${req.params.id}.`))

  return Model.remove(req.params.id).then(() => res.send({ success: true })).catch(next)
}