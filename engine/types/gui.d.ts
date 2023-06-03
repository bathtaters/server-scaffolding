import type {
    htmlTypes, htmlStringTypes, htmlNumberTypes, htmlDateTypes, htmlBoolTypes,
    htmlValidationDict, actions, formData, pageSelect, metaField, formEffects
} from './gui'
import type { Definition, SchemaOf } from './Model.d'

export type HTMLType       = typeof htmlTypes[keyof typeof htmlTypes]
export type HTMLStringType = typeof htmlStringTypes[keyof typeof htmlStringTypes]
export type HTMLNumberType = typeof htmlNumberTypes[keyof typeof htmlNumberTypes]
export type HTMLDateType   = typeof htmlDateTypes[keyof typeof htmlDateTypes]
export type HTMLBoolType   = typeof htmlBoolTypes[keyof typeof htmlBoolTypes]

export type FormAction = typeof actions[keyof typeof actions]

export type FormEffect = typeof formEffects[keyof typeof formEffects]

export type PaginationData<Schema extends object = any> =
    Omit<SchemaOf<typeof pageSelect>,'id'|'sort'> & {
        sort?: keyof Schema | null
    }

export type RawFormData = Omit<SchemaOf<typeof formData>,'id'>

export type FormData<Schema extends object = any> =
    Omit<RawFormData, typeof metaField['button' | 'page']> & {
        [metaField.button]?: FormAction | null,
        [metaField.page]?:   PaginationData<Schema>,
    }

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
export type ActionObject = { [action in FormAction]: ActionFunction }

/** Convert Validation Base type to HTML type */
export type ValidToHTML<T extends keyof typeof htmlValidationDict | string> = T extends keyof typeof htmlValidationDict
    ? typeof htmlValidationDict[T]
    : typeof htmlValidationDict['default']


/** Possible values for HTMLType */
export type HTMLTypeFull = HTMLType | number | string[]

/** Extract Type from HTMLType string */
export type ExtractHTMLType<D extends HTMLTypeFull | undefined> = 
    D extends undefined ? never : TypeOfHTML<D>

/** Convert SQLTypes to Types */
type TypeOfHTML<S extends HTMLTypeFull | undefined> = 
    S extends never    ? any :
    S extends string[] ? S[number] :
    S extends number   ? string :
    S extends HTMLType ? string :
        never
