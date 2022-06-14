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
  if (!entry || !entry[Model.primaryId]) return next(errors.noEntry(req.params.id))

  return Model.update(entry[Model.primaryId], req.body).then(() => res.send({ success: true })).catch(next)
}

exports.delete = (Model) => async function (req,res,next) {
  if (req.params.id == null) return next(errors.noID())

  const entry = await Model.get(req.params.id).catch(next)
  if (!entry || !entry[Model.primaryId]) return next(errors.noEntry(req.params.id))

  return Model.remove(req.params.id).then(() => res.send({ success: true })).catch(next)
}

const TEMP_ID = -11
exports.swap = (Model) => async function (req,res,next) {
  if (req.body[Model.primaryId] == null || req.body.swap == null) return next(errors.noID())
  
  const resultId = Model.primaryId.toLowerCase()
  try {
    const entryA = await Model.get(req.body[Model.primaryId]).then((r) => r && r[resultId])
    const entryB = await Model.get(req.body.swap).then((r) => (r && r[resultId]))

    if (entryA == null) return next(errors.noEntry(req.body[Model.primaryId]))

    // ID change
    if (entryB == null) return Model.update(entryA,  { [Model.primaryId]: req.body.swap  }).then(res.send).catch(next)

    // ID swap
    await Model.update(entryB,  { [Model.primaryId]: TEMP_ID })
    await Model.update(entryA,  { [Model.primaryId]: entryB  })
    await Model.update(TEMP_ID, { [Model.primaryId]: entryA  })
  }
  catch (err) { return next(err) }

  return res.send({ success: true })
}