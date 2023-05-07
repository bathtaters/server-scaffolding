import type Model from '../models/Model'
import type { Feedback } from '../types/Model.d'
import type { Endware } from '../types/express.d'
import { matchedData } from 'express-validator'
import * as errors from '../config/errors.engine'
import { getMatchingKey } from '../utils/common.utils'


export const create = <M extends Model<any>>(Model: M): Endware<M extends Model<infer S> ? S : never> =>
  function create(req,res,next) {
    const data = matchedData(req)
    if (!data || !Object.keys(data).length) return next(errors.noData())

    return Model.addAndReturn([data])
      .then((entry) => res.send(entry)).catch(next)
  }


export const read = <M extends Model<any>>(Model: M): Endware<M extends Model<infer S> ? S | S[] : never> =>
  async function read(req,res,next) {
    const id = matchedData(req)[Model.primaryId]

    const data = await (id != null ? Model.get(id) : Model.find()).catch(next)

    return data ? res.send(data) : next(errors.noEntry(id || '[All]'))
  }


export const update = <M extends Model<any>>(Model: M): Endware<Feedback> =>
  async function update(req,res,next) {
    const data = matchedData(req)
    if (data[Model.primaryId] == null) return next(errors.noID())
    if (!data || !Object.keys(data).length) return next(errors.noData())

    return Model.update(data[Model.primaryId], data)
      .then((fdbk) => res.send(fdbk))
      .catch(next)
  }


export const remove = <M extends Model<any>>(Model: M): Endware<Feedback> =>
  async function remove(req,res,next) {
    const id = matchedData(req)[Model.primaryId]
    if (id == null) return next(errors.noID())

    return Model.remove(id)
      .then((fdbk) => res.send(fdbk))
      .catch(next)
  }


export const swap = <M extends Model<any>>(Model: M): Endware<Feedback> =>
  async function swap(req,res,next) {
    const data = matchedData(req)
    
    const idKey = getMatchingKey(data, Model.primaryId)
    if (!idKey) return next(errors.noID())
    
    return Model.swap(data[idKey], data.swap)
      .then((fdbk) => res.send(fdbk))
      .catch(next)
  }