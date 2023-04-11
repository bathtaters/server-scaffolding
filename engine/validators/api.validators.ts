import { byModel, type ModelValBase } from './shared.validators'

export const all    = <M extends ModelValBase>(Model: M) => byModel(Model, 'all', { optionalBody: false })
export const idAll  = <M extends ModelValBase>(Model: M) => byModel(Model, 'all', { params: [Model.primaryId] })
export const idOnly = <M extends ModelValBase>(Model: M) => byModel(Model, [],    { params: [Model.primaryId] })
    
export const swap = <M extends ModelValBase>(Model: M) => byModel(
    Model,
    { [Model.primaryId]: Model.primaryId, swap: Model.primaryId },
    { optionalBody: false }
)
