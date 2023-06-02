import type { ModelValidationOptions, SchemaKeys, ValidationOptions } from '../types/validate.d'
import type { FormAction } from '../types/gui.d'
import { actions, formData, pageSelect } from '../types/gui'
import Users from '../models/Users'
import { type ModelValBase, byModel, byObject } from './shared.validators'

export { swap, all } from './api.validators'

/** Non-Schema fields in GUI Form */
export const formAdditional: ValidationOptions[] = Object.entries(formData)
  .map(([ key, data ]) => ({ ...data, key, isIn: ['body'] }))

/** Additional fields for User Profile GUI */
export const profileFields = {
  [Users.primaryId]: Users.primaryId,
  username: 'username',
  password: 'password',
  confirm:  'password',
} as const



// --- Static Validation --- \\
export const page =  byObject(pageSelect, ['query'])
export const token = byModel(Users, [Users.primaryId], { optionalBody: false })

// --- Validation Generators --- \\
export const profile = (action: FormAction) =>
  byModel(Users, ...actionOptions(Users, action, profileFields))

export const find = <M extends ModelValBase>(Model: M, formFields: SchemaKeys<M> = 'all') =>
  byModel(Model, formFields, { allowPartials: true, asQueryStr: true })

export const form = <M extends ModelValBase>
  (Model: M, action: FormAction, formFields: SchemaKeys<M> = 'all', findFields?: SchemaKeys<M>) =>
    byModel(Model, ...actionOptions(Model, action, formFields, findFields))



    

/** Get validation options from Model + Form Action */
function actionOptions<M extends ModelValBase>(
  { primaryId }: M,
  action: FormAction,
  fields: SchemaKeys<M>,
  findFields?: SchemaKeys<M>): [SchemaKeys<M>, ModelValidationOptions<M>]
{
  switch(action) {
    case actions.find:   return [findFields||fields, { additional: formAdditional, allowPartials: true }]
    case actions.create: return [fields,             { additional: formAdditional, optionalBody: false }]
    case actions.update: return [fields,             { additional: formAdditional }]
    case actions.delete: return [[primaryId],        { additional: formAdditional }]
    case actions.clear:  return [[],                 { additional: formAdditional }]
    default: return [[], {}]
  }
}