const errors = require('../config/constants/error.messages')

exports.create = (Model) => function (req,res,next) {
  if (!req.body || !Object.keys(req.body).length) return next(errors.noData())
  return Model.add(req.body).then((id) => res.send({ id })).catch(next)
}

exports.read = (Model) => function (req,res,next) {
  return Model.get(req.params.id).then((data) =>
    data ? res.send(data) : next(errors.noEntry(req.params.id || '[All]'))
  ).catch(next)
}

exports.update = (Model) => async function (req,res,next) {
  if (req.params.id == null) return next(errors.noID())
  if (!req.body || !Object.keys(req.body).length) return next(errors.noData())
  
  const entry = await Model.get(req.params.id).catch(next)
  if (!entry || !entry.id) return next(errors.noEntry(req.params.id))

  return Model.update(entry.id, req.body).then(() => res.send({ success: true })).catch(next)
}

exports.delete = (Model) => async function (req,res,next) {
  if (req.params.id == null) return next(errors.noID())

  const entry = await Model.get(req.params.id).catch(next)
  if (!entry || !entry.id) return next(errors.noEntry(req.params.id))

  return Model.remove(req.params.id).then(() => res.send({ success: true })).catch(next)
}

const TEMP_ID = -11
exports.swap = (Model) => async function (req,res,next) {
  if (req.body.id == null || req.body.swap == null) return next(errors.noID())
  
  const entryA = await Model.get(req.body.id).then((r) => r && r.id).catch(next)
  const entryB = await Model.get(req.body.swap).then((r) => r && r.id).catch(next)
  if (!entryA || !entryB) return next(errors.noEntry(`${req.body.id} or ${req.body.swap}`))

  await Model.update(entryA,  { id: TEMP_ID }).catch(next)
  await Model.update(entryB,  { id: entryA  }).catch(next)
  await Model.update(TEMP_ID, { id: entryB  }).catch(next)
  return res.send({ success: true })
}