import type { htmlTypes, actions } from './gui'
import type { Definition } from './Model.d'

export type HTMLType = typeof htmlTypes[keyof typeof htmlTypes]

// TODO -- Convert this to FormAction + Remove PLURAL
export type ProfileActionKeys = keyof typeof actions
export type ProfileActions = typeof actions[keyof typeof actions]

export type FormDefinition = {
    default?: string,
    html: {
        type: Definition<'any'>['html'],
        limits?: Definition<'any'>['limits'],
        readonly?: boolean,
    },
    tooltip?: string,
    formDefault?: string,
}

type ActionFunction = (formData: Record<string,any>) => Promise<string | void>
export type ActionObject = { [action in ProfileActions]: ActionFunction }


/** Extract Type from HTMLType string */
export type ExtractHTMLType<D extends HTMLType | undefined> = 
    D extends undefined ? never : TypeOfHTML<D>

/** Convert SQLTypes to Types */
type TypeOfHTML<S extends HTMLType | undefined> = 
    S extends never    ? any :
    S extends HTMLType ? string :
        never
