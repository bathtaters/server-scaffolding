const { matchedData } = require('express-validator')
const errors = require('../config/errors.engine')
const { getMatchingKey } = require('../utils/common.utils')

exports.create = (Model) => function (req,res,next) {
  const data = matchedData(req)
  if (!data || !Object.keys(data).length) return next(errors.noData())
  return Model.add(data).then((entry) => res.send(entry)).catch(next)
}

exports.read = (Model) => function (req,res,next) {
  const id = matchedData(req)[Model.primaryId]
  return Model.get(id).then((data) =>
    data ? res.send(data) : next(errors.noEntry(id || '[All]'))
  ).catch(next)
}

exports.update = (Model) => async function (req,res,next) {
  const data = matchedData(req)
  if (data[Model.primaryId] == null) return next(errors.noID())
  if (!data || !Object.keys(data).length) return next(errors.noData())
  
  const entry = await Model.get(data[Model.primaryId]).catch(next)
  if (!entry || !entry[Model.primaryId]) return next(errors.noEntry(data[Model.primaryId]))

  return Model.update(entry[Model.primaryId], data).then(() => res.send({ success: true })).catch(next)
}

exports.delete = (Model) => async function (req,res,next) {
  const id = matchedData(req)[Model.primaryId]
  if (id == null) return next(errors.noID())

  const entry = await Model.get(id).catch(next)
  if (!entry || !entry[Model.primaryId]) return next(errors.noEntry(id))

  return Model.remove(id).then(() => res.send({ success: true })).catch(next)
}

const TEMP_ID = -0xFF
exports.swap = (Model) => async function (req,res,next) {
  const data = matchedData(req)
  const idA = data[getMatchingKey(data, Model.primaryId)], idB = data.swap
  if (idA == null || idB == null) return next(errors.noID())
  
  try {
    const entryA = await Model.get(idA).then((r) => r && r[Model.primaryId])
    const entryB = await Model.get(idB).then((r) => r && r[Model.primaryId])

    if (entryA == null) return next(errors.noEntry(idA))

    // ID change
    if (entryB == null) return Model.update(entryA, { [Model.primaryId]: idB  }).then((r) => res.send(r)).catch(next)

    // ID swap
    await Model.update(entryB,  { [Model.primaryId]: TEMP_ID })
    await Model.update(entryA,  { [Model.primaryId]: entryB  })
    await Model.update(TEMP_ID, { [Model.primaryId]: entryA  })
  }
  catch (err) { return next(err) }

  return res.send({ success: true })
}