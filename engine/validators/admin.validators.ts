import type { ProfileActions } from '../types/gui'
import type { KeyObj } from '../types/validate'
import Users from '../models/Users'
import { definition, searchableKeys } from '../config/users.cfg'
import { definitions as settingsDefinition } from '../config/settings.cfg'
import { byObject } from './shared.validators'
import { find as guiFind, form, formAdditional } from './gui.validators'
import { formSettingsToValidate } from '../utils/validate.utils'

// Validators
export { page, token } from './gui.validators'

export const logs = byObject({ filename: { typeStr: 'string*' } }, ['params'])
export const settings = byObject(formSettingsToValidate(settingsDefinition), ['body'], { additional: formAdditional })
export const find = guiFind(Users, searchableKeys)
export const user = (action: ProfileActions) => form(Users, action, formFields, searchableKeys)



// Add 'confirm' to validation using same validation as 'password'
let formFields: KeyObj<typeof Users> = { confirm: 'password' }

Object.entries(definition).forEach(([field, def]) => {
    if (def.html !== false) formFields[field] = field as keyof typeof definition
})