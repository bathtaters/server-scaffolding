import type { ModelValidationOptions, SchemaKeys, ValidationOptions } from '../types/validate.d'
import type { ProfileActions } from '../types/gui.d'
import { actions } from '../types/gui'
import Users from '../models/Users'
import { type ModelValBase, byModel, byObject } from './shared.validators'

export { swap, all } from './api.validators'

/** Non-Schema fields in GUI Form */
export const formAdditional: ValidationOptions[] = [
  { key: '_action',     typeStr: 'string',   isIn: ['body'], limits: { max: 16 } },
  { key: '_pageData',   typeStr: 'object?',  isIn: ['body'], limits: { max: 32 } },
  { key: '_searchMode', typeStr: 'boolean?', isIn: ['body'], },
]

/** Additional fields for GUI pagination */
export const pageAdditional = {
  page: { typeStr: 'int?', limits: { min: 1 } },
  size: { typeStr: 'int?', limits: { min: 1 } },
} as const

/** Additional fields for User Profile GUI */
export const profileFields = {
  [Users.primaryId]: Users.primaryId,
  username: 'username',
  password: 'password',
  confirm:  'password',
} as const



// --- Static Validation --- \\
export const page =  byObject(pageAdditional, ['query'])
export const token = byModel(Users, [Users.primaryId], { optionalBody: false })

// --- Validation Generators --- \\
export const profile = (action: ProfileActions) =>
  byModel(Users, ...actionOptions(Users, action, profileFields))

export const find = <M extends ModelValBase>(Model: M, formFields: SchemaKeys<M> = 'all') =>
  byModel(Model, formFields, { allowPartials: true, asQueryStr: true })

export const form = <M extends ModelValBase>
  (Model: M, action: ProfileActions, formFields: SchemaKeys<M> = 'all', findFields?: SchemaKeys<M>) =>
    byModel(Model, ...actionOptions(Model, action, formFields, findFields))



    

/** Get validation options from Model + Form Action */
function actionOptions<M extends ModelValBase>(
  { primaryId }: M,
  action: ProfileActions,
  fields: SchemaKeys<M>,
  findFields?: SchemaKeys<M>): [SchemaKeys<M>, ModelValidationOptions<M>]
{
  switch(action) {
    case actions.find:   return [findFields||fields, { additional: formAdditional, allowPartials: true }]
    case actions.create: return [fields,             { additional: formAdditional, optionalBody: false }]
    case actions.update: return [fields,             { additional: formAdditional }]
    case actions.delete: return [[primaryId],        { additional: formAdditional }]
    case actions.clear:  return [[],                 { additional: formAdditional }]
  }
  return [[], {}]
}