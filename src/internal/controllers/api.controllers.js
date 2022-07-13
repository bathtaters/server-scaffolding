const errors = require('../config/errors.internal')
const { getMatchingKey } = require('../utils/common.utils')

exports.create = (Model) => function (req,res,next) {
  if (!req.body || !Object.keys(req.body).length) return next(errors.noData())
  return Model.add(req.body).then((id) => res.send({ [Model.primaryId]: id })).catch(next)
}

exports.read = (Model) => function (req,res,next) {
  return Model.get(req.params[Model.primaryId]).then((data) =>
    data ? res.send(data) : next(errors.noEntry(req.params[Model.primaryId] || '[All]'))
  ).catch(next)
}

exports.update = (Model) => async function (req,res,next) {
  if (req.params[Model.primaryId] == null) return next(errors.noID())
  if (!req.body || !Object.keys(req.body).length) return next(errors.noData())
  
  const entry = await Model.get(req.params[Model.primaryId]).catch(next)
  if (!entry || !entry[Model.primaryId]) return next(errors.noEntry(req.params[Model.primaryId]))

  return Model.update(entry[Model.primaryId], req.body).then(() => res.send({ success: true })).catch(next)
}

exports.delete = (Model) => async function (req,res,next) {
  if (req.params[Model.primaryId] == null) return next(errors.noID())

  const entry = await Model.get(req.params[Model.primaryId]).catch(next)
  if (!entry || !entry[Model.primaryId]) return next(errors.noEntry(req.params[Model.primaryId]))

  return Model.remove(req.params[Model.primaryId]).then(() => res.send({ success: true })).catch(next)
}

const TEMP_ID = -11
exports.swap = (Model) => async function (req,res,next) {
  const idA = getMatchingKey(req.body, Model.primaryId), idB = req.body.swap
  if (idA == null || idB == null) return next(errors.noID())
  
  try {
    const entryA = await Model.get(idA).then((r) => r && getMatchingKey(r, Model.primaryId))
    const entryB = await Model.get(idB).then((r) => r && getMatchingKey(r, Model.primaryId))

    if (entryA == null) return next(errors.noEntry(idA))

    // ID change
    if (entryB == null) return Model.update(entryA,  { [Model.primaryId]: idB  }).then(res.send).catch(next)

    // ID swap
    await Model.update(entryB,  { [Model.primaryId]: TEMP_ID })
    await Model.update(entryA,  { [Model.primaryId]: entryB  })
    await Model.update(TEMP_ID, { [Model.primaryId]: entryA  })
  }
  catch (err) { return next(err) }

  return res.send({ success: true })
}