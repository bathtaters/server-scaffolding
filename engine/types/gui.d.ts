import type { EnvSettings } from './process.d'
import type { Definition } from './Model'
import { guiCfg } from '../src.import'

export const profileLabels = guiCfg.profileActions.map((action) => guiCfg.actions[action])

export const htmlTypes = {
    id: "id",
    readonly: "readonly",
    button: "button",
    checkbox: "checkbox",
    color: "color",
    date: "date",
    datetime: "datetime-local",
    email: "email",
    file: "file",
    hidden: "hidden",
    image: "image",
    month: "month",
    number: "number",
    password: "password",
    radio: "radio",
    range: "range",
    reset: "reset",
    search: "search",
    submit: "submit",
    tel: "tel",
    text: "text",
    time: "time",
    url: "url",
    week: "week"
} as const

export type HTMLType = typeof htmlTypes[keyof typeof htmlTypes]

export type ProfileActionKeys = keyof typeof guiCfg.actions
export type ProfileActions = typeof guiCfg.actions[keyof typeof guiCfg.actions]
export type UserProfileActions = typeof profileLabels[number]

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