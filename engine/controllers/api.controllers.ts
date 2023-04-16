import { matchedData } from 'express-validator'
import * as errors from '../config/errors.engine'
import { getMatchingKey } from '../utils/common.utils'
import { ModelBase } from '../models/Model'
import { Middleware } from '../types/express'


export const create = <M extends ModelBase>(Model: M): Middleware =>
  function create(req,res,next) {
    const data = matchedData(req)
    if (!data || !Object.keys(data).length) return next(errors.noData())

    return Model.addAndReturn([data])
      .then((entry) => res.send(entry)).catch(next)
  }


export const read = <M extends ModelBase>(Model: M): Middleware =>
  async function read(req,res,next) {
    const id = matchedData(req)[Model.primaryId]

    const data = await (id != null ? Model.get(id) : Model.find()).catch(next)

    return data ? res.send(data) : next(errors.noEntry(id || '[All]'))
  }


export const update = <M extends ModelBase>(Model: M): Middleware =>
  async function update(req,res,next) {
    const data = matchedData(req)
    if (data[Model.primaryId] == null) return next(errors.noID())
    if (!data || !Object.keys(data).length) return next(errors.noData())

    return Model.update(data[Model.primaryId], data)
      .then((fdbk) => res.send(fdbk as any))
      .catch(next)
  }


export const remove = <M extends ModelBase>(Model: M): Middleware =>
  async function remove(req,res,next) {
    const id = matchedData(req)[Model.primaryId]
    if (id == null) return next(errors.noID())

    return Model.remove(id)
      .then((fdbk) => res.send(fdbk as any))
      .catch(next)
  }


export const swap = <M extends ModelBase>(Model: M): Middleware =>
  async function swap(req,res,next) {
    const data = matchedData(req)
    
    const idKey = getMatchingKey(data, Model.primaryId)
    if (!idKey) return next(errors.noID())
    
    return Model.swap(data[idKey], data.swap)
      .then((fdbk) => res.send(fdbk as any))
      .catch(next)
  }