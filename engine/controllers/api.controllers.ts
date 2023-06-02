import type { GenericModel } from '../models/Model'
import type { ApiResponse } from '../types/Model.d'
import type { Endware } from '../types/express.d'
import { matchedData } from 'express-validator'
import * as errors from '../config/errors.engine'
import { extractValue, getMatchingKey, getMatchingValue } from '../utils/common.utils'


export const create = <M extends GenericModel>(Model: M): Endware<ApiResponse.Create> =>
  function create(req,res,next) {
    const data = matchedData(req)
    if (!data || !Object.keys(data).length) return next(errors.noData())

    return Model.addAndReturn([data])
      .then((entry) => res.send(entry))
      .catch(next)
  }


export const read = <M extends GenericModel>(Model: M): Endware<ApiResponse.Read> =>
  async function read(req,res,next) {
    const id = getMatchingValue(matchedData(req), Model.primaryId)

    const data = await (id != null ? Model.get(id) : Model.find()).catch(next)

    return data ? res.send(data) : next(errors.noEntry(id || '[All]'))
  }


export const update = <M extends GenericModel>(Model: M): Endware<ApiResponse.Update> =>
  async function update(req,res,next) {
    const data = matchedData(req)
    const id = extractValue(data, Model.primaryId)

    if (id == null) return next(errors.noID())
    if (!data || !Object.keys(data).length) return next(errors.noData())

    return Model.update(id, data)
      .then((fdbk) => res.send(fdbk))
      .catch(next)
  }


export const remove = <M extends GenericModel>(Model: M): Endware<ApiResponse.Delete> =>
  async function remove(req,res,next) {
    const id = getMatchingValue(matchedData(req), Model.primaryId)
    if (id == null) return next(errors.noID())

    return Model.remove(id)
      .then((fdbk) => res.send(fdbk))
      .catch(next)
  }


export const swap = <M extends GenericModel>(Model: M): Endware<ApiResponse.SwapID> =>
  async function swap(req,res,next) {
    const data = matchedData(req)
    
    const idKey = getMatchingKey(data, Model.primaryId)
    if (!idKey) return next(errors.noID())
    
    return Model.swap(data[idKey], data.swap)
      .then((fdbk) => res.send(fdbk))
      .catch(next)
  }