import type { ModelFormBase } from '../types/controllers.d'
import type { ActionObject } from '../types/gui.d'
import { actions } from '../types/gui'
import { noData, noAdd, noID } from '../config/errors.engine'
import { isDate } from '../libs/date'
import { extractValue } from '../utils/common.utils'

import { urlCfg } from '../src.import'
const searchURL = urlCfg.gui.basic.find


/** Actions based on Form submit button label */
export default function modelActions<M extends ModelFormBase>(Model: M): ActionObject {
  return {

    /** SEARCH */
    [actions.find]: async (formData) => {
      if (!formData || !Object.keys(formData).length) return ''
      if (!Object.keys(formData).length) return ''
      Object.keys(formData).forEach((k) => { if (isDate(formData[k])) formData[k] = formData[k].toJSON() })
      return `${searchURL}?${new URLSearchParams(formData).toString()}`
    },

    /** ADD */
    [actions.create]: async (formData = {}) => {
      extractValue(formData, Model.primaryId)
      if (!formData || !Object.keys(formData).length) throw noData()
      const result = await Model.addAndReturn([formData])
      if (!result) throw noAdd()
    },

    /** UPDATE */
    [actions.update]: async (formData = {}) => {
      const id = extractValue(formData, Model.primaryId)
      if (id == null) throw noID()
      if (!formData || !Object.keys(formData).length) throw noData()
      return Model.update(id, formData).then(() => {})
    },

    /** REMOVE */
    [actions.delete]: async (formData = {}) => {
      const id = formData[Model.primaryId]
      if (id == null) throw noID()
      return Model.remove(id).then(() => {})
    },

    /** RESET */
    [actions.clear]: () => Model.create(true).then(() => {})
  }
}
