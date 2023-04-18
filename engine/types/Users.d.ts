import type { allModelsKey, access, models, modelsStrings, timestamps, profileLabels } from "./Users"
import type { DefinitionSchema, SQLOptions } from "./Model.d"

// TODO: RENAME ACCESS => PRIVLEGES && MODELS => ACCESS

type Cors = boolean | string[] | string | RegExp

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

export type AccessType  = keyof typeof access
export type ModelsType  = keyof typeof models
export type ModelsString = typeof modelsStrings[keyof typeof modelsStrings] | `${typeof modelsStrings['read']}${typeof modelsStrings['write']}`
export type TimestampType  = typeof timestamps[keyof typeof timestamps]
export type ModelObject<Models extends string> = { [M in Models]+?: number } & { [allModelsKey]: number }

export type UserDefinition = DefinitionSchema<UsersUI, UsersDB>

export type ProfileActions = typeof profileLabels[number]

type TimestampTimes<DateType = Date>  = { [T in TimestampType as `${T}Time`]+?: DateType }
type TimestampCounts = { [T in TimestampType as `${T}Count`]+?: number }
type TimestampHTML   = { [T in TimestampType as `${T}Time`]+?:  string }

export type GetOptions<ID extends string = keyof (UsersUI | UsersDB) & string> = { idKey?: ID, timestamp?: TimestampType, ignoreCounter?: boolean } & SQLOptions<UsersDB>
export type UpdateOptions<ID extends string = keyof (UsersUI | UsersDB) & string> = { idKey?: ID, reset?: boolean } & SQLOptions<UsersDB>