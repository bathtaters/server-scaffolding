import type { Definition, DefinitionSchema } from "./Model.d"
import { actions } from "./gui.d"
import { profileActions } from "../config/users.cfg"

export const noAccess = 'none' as const
export const noModelAccessChar = '-' as const
export const allModelsKey = 'default' as const

// TODO: RENAME ACCESS => PRIVLEGES && MODELS => ACCESS

type Cors = boolean | number | string | RegExp

export const access = Object.freeze({
    api:   0x1,
    gui:   0x2,
    admin: 0x4,
    [noAccess]: 0x0,
})
export const models = Object.freeze({
    read:  0x1,
    write: 0x2,
    [noAccess]: 0x0,
})
export const modelsStrings = Object.freeze({
    read:  'r',
    write: 'w',
    [noAccess]: noModelAccessChar,
})

type UsersBase = {
    id: string, // hex
    username: string,
    token: string, // hex
    cors?: Cors,
    failCount?: int,
    failTime?: Date,
    guiCount?: int,
    guiTime?: Date,
    apiCount?: int,
    apiTime?: Date,
    locked: boolean,
}

export type UsersDB = UsersBase & {
    access: number, // bitmap
    models: string, // JSON
    pwkey?: string, // hex
    salt?:  string, // hex
}

export type UsersUI = UsersBase & {
    access?: number, // not Access[], doesn't run through Setter
    models: ModelObject<string>,
    password?: boolean | string,
    confirm?: string,
}

export type UsersHTML = {
    id: string, // hex
    token: string, // hex
    username: string,
    cors?: string,
    regExCors?: boolean,
    arrayCors?: boolean,
    failTime?: string,
    guiTime?: string,
    apiTime?: string,
    locked: boolean,
    access?: string,
    models: string | string[],
    password?: boolean | string,
    confirm?: string,
    hadError?: boolean,
}

// TODO -- Define session data object
export type SessionData = { undoSettings?: any }

export type AccessTypes  = keyof typeof access
export type ModelsTypes  = keyof typeof models
export type ModelsString = typeof modelsStrings[keyof typeof modelsStrings] | `${typeof modelsStrings['read']}${typeof modelsStrings['write']}`
export type ModelObject<Models extends string> = { [M in Models]: number } & { [allModelsKey]: number }

export type UserDefinition = DefinitionSchema<UsersUI, UsersDB>

export const profileLabels = profileActions.map((action) => actions[action])
export type ProfileActions = typeof profileLabels[number]