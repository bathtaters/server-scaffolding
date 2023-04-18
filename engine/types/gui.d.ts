import type { htmlTypes, actions } from './gui'
import type { Definition } from './Model.d'

export type HTMLType = typeof htmlTypes[keyof typeof htmlTypes]

// TODO -- Convert this to FormAction + Remove PLURAL
// TODO -- Make ProfileActions only what you can do in non-admin User Profile (Put in User?) 
export type ProfileActionKeys = keyof typeof actions
export type ProfileActions = typeof actions[keyof typeof actions]

export type FormDefinition = {
    default?: string,
    html: {
        type: Definition['html'],
        limits?: Definition['limits'],
        readonly?: boolean,
    },
    tooltip?: string,
    formDefault?: string,
}

type ActionFunction = (formData: Record<string,any>) => Promise<string | void>
export type ActionObject = { [action in ProfileActions]: ActionFunction }