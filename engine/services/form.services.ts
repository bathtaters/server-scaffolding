import type { ModelBase } from '../models/Model'
import { type ProfileActions, actions } from '../types/gui.d'
import { noData, noAdd, noID } from '../config/errors.engine'
import { isDate } from '../libs/date'
import { extractId } from '../utils/db.utils'

import { urlCfg } from '../src.import'
const searchURL = urlCfg.gui.basic.find


// Actions based on Form submit button label
export default function formObject<Model extends ModelBase>(Model: Model): { [action in ProfileActions]: ActionFunction } {
  return {

    // SEARCH
    [actions.find]: async (formData) => {
      if (!formData || !Object.keys(formData).length) return ''
      if (!Object.keys(formData).length) return ''
      Object.keys(formData).forEach((k) => { if (isDate(formData[k])) formData[k] = formData[k].toJSON() })
      return `${searchURL}?${new URLSearchParams(formData).toString()}`
    },

    // ADD
    [actions.create]: async (formData = {}) => {
      const [_, data] = extractId(formData, Model.primaryId)
      if (!data || !Object.keys(data).length) throw noData()
      const result = await Model.addAndReturn([data])
      if (!result) throw noAdd()
    },

    // UPDATE
    [actions.update]: async (formData = {}) => {
      const [id, data] = extractId(formData, Model.primaryId)
      if (!id && id !== 0) throw noID()
      if (!data || !Object.keys(data).length) throw noData()
      return Model.update(id, data).then(() => {})
    },

    // REMOVE
    [actions.delete]: async (formData = {}) => {
      const id = formData[Model.primaryId]
      if (!id && id !== 0) throw noID()
      return Model.remove(id).then(() => {})
    },

    // RESET
    [actions.clear]: () => Model.create(true).then(() => {})
  }
}

type ActionFunction = (formData?: Record<string, any>) => Promise<any>