import type { Definition, DefinitionSchema, SQLOptions } from "./Model.d"
import { actions } from "./gui.d"
import { profileActions } from "../config/users.cfg"

export const noAccess = 'none' as const
export const noModelAccessChar = '-' as const
export const allModelsKey = 'default' as const

// TODO: RENAME ACCESS => PRIVLEGES && MODELS => ACCESS

type Cors = boolean | string[] | string | RegExp

export const access = Object.freeze({
    api:   0x1,
    gui:   0x2,
    admin: 0x4,
    [noAccess]: 0x0,
}) as const
export const models = Object.freeze({
    read:  0x1,
    write: 0x2,
    [noAccess]: 0x0,
}) as const
export const modelsStrings = Object.freeze({
    read:  'r',
    write: 'w',
    [noAccess]: noModelAccessChar,
}) as const
export const timestamps = Object.freeze({
    gui:  'gui',
    api:  'api',
    fail: 'fail',
}) as const

type UsersBase = {
    id: string, // hex
    username: string,
    token: string, // hex
    cors?: Cors,
    locked?: boolean,
} & TimestampCounts

export type UsersDB = UsersBase & {
    access: number, // bitmap
    models: string, // JSON
    pwkey?: string, // hex
    salt?:  string, // hex
} & TimestampTimes<number>

export type UsersUI = UsersBase & {
    access?: number, // not Access[], doesn't run through Setter
    models?: ModelObject<string>,
    password?: boolean | string,
    confirm?: string,
} & TimestampTimes<Date>

export type UsersHTML = {
    id: string, // hex
    token: string, // hex
    username: string,
    cors?: string,
    regExCors?: boolean,
    arrayCors?: boolean,
    locked: boolean,
    access?: string,
    models: string | string[],
    password?: boolean | string,
    confirm?: string,
    hadError?: boolean,
} & TimestampHTML

// TODO -- Define session data object
export type SessionData = { undoSettings?: any }

export type AccessType  = keyof typeof access
export type ModelsType  = keyof typeof models
export type ModelsString = typeof modelsStrings[keyof typeof modelsStrings] | `${typeof modelsStrings['read']}${typeof modelsStrings['write']}`
export type TimestampType  = typeof timestamps[keyof typeof timestamps]
export type ModelObject<Models extends string> = { [M in Models]+?: number } & { [allModelsKey]: number }

export type UserDefinition = DefinitionSchema<UsersUI, UsersDB>

export const profileLabels = profileActions.map((action) => actions[action])
export type ProfileActions = typeof profileLabels[number]

type TimestampTimes<DateType = Date>  = { [T in TimestampType as `${T}Time`]+?: DateType }
type TimestampCounts = { [T in TimestampType as `${T}Count`]+?: number }
type TimestampHTML   = { [T in TimestampType as `${T}Time`]+?:  string }

export type GetOptions<ID    = keyof (UsersUI | UsersDB) & string> = { idKey?: ID, timestamp?: TimestampType, ignoreCounter?: boolean } & SQLOptions<UsersDB>
export type UpdateOptions<ID = keyof (UsersUI | UsersDB) & string> = { idKey?: ID, reset?: boolean } & SQLOptions<UsersDB>