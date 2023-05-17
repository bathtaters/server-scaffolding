import type { htmlTypes, actions, htmlValidationDict } from './gui'
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

/** Convert Validation Base type to HTML type */
export type ValidToHTML<T extends keyof typeof htmlValidationDict | string> = T extends keyof typeof htmlValidationDict
    ? typeof htmlValidationDict[T]
    : typeof htmlValidationDict['default']


/** Extract Type from HTMLType string */
export type ExtractHTMLType<D extends HTMLType | number | undefined> = 
    D extends undefined ? never : TypeOfHTML<D>

/** Convert SQLTypes to Types */
type TypeOfHTML<S extends HTMLType | number | undefined> = 
    S extends never    ? any :
    S extends number   ? string :
    S extends HTMLType ? string :
        never
