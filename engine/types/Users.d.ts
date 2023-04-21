import type { Role, ModelAccess, timestamps } from "./Users"
import type { DefinitionSchema, SQLOptions } from "./Model.d"
import type { BitMapBase, FlagType } from "./BitMap"
import type { BitMapObjBase, ExtractBitMap, ObjDefType, ObjFlagType, ObjKeyType } from "./BitMapObj.d"

type UsersBase = {
    id:       string, // hex
    username: string,
    password?: string,
    token:    string, // hex
    locked?:  boolean,
} & TimestampCounts

export type UsersDB = UsersBase & {
    cors?:  string,
    role:   number, // Bitmap
    access: string, // JSON
    salt?:  string, // hex
} & TimestampTimes<number>

export type UsersUI = UsersBase & {
    cors?:     Cors,
    role?:     RoleType,
    access?:   AccessType,
    confirm?:  string,
} & TimestampTimes<Date>

export type UsersHTML = {
    id: string, // hex
    token: string, // hex
    username: string,
    cors?: string,
    regExCors?: boolean,
    arrayCors?: boolean,
    locked: boolean, 
    role?: string | string[],
    access: string | string[],
    password?: string,
    confirm?: string,
    hadError?: boolean,
} & TimestampHTML

export type UserDefinition = DefinitionSchema<UsersUI, UsersDB>

export type RoleType     = BitMapBase<FlagType<typeof Role>>
export type AccessType   = BitMapObjBase<ObjKeyType<typeof ModelAccess>, ObjFlagType<typeof ModelAccess>, ObjDefType<typeof ModelAccess>>
export type AccessBitMap = ExtractBitMap<typeof ModelAccess>

export type Cors = boolean | string[] | string | RegExp

export type TimestampType  = typeof timestamps[keyof typeof timestamps]
type TimestampTimes<DateType = Date>  = { [T in TimestampType as `${T}Time`]+?: DateType }
type TimestampCounts = { [T in TimestampType as `${T}Count`]+?: number }
type TimestampHTML   = { [T in TimestampType as `${T}Time`]+?:  string }

export type GetOptions<ID extends string = keyof (UsersUI | UsersDB) & string> = { idKey?: ID, timestamp?: TimestampType, ignoreCounter?: boolean } & SQLOptions<UsersDB>
export type UpdateOptions<ID extends string = keyof (UsersUI | UsersDB) & string> = { idKey?: ID, reset?: boolean } & SQLOptions<UsersDB>