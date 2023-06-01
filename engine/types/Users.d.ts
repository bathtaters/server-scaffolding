import type { Role, ModelAccess, timestamps } from "./Users"
import type { IDOf, SQLOptions } from "./Model.d"
import type { ExtractBitMap } from "./BitMapObj.d"
import type { definition } from "../config/users.cfg"

export type UserDef = typeof definition

export type RoleType     = InstanceType<typeof Role>
export type AccessType   = InstanceType<typeof ModelAccess>
export type AccessBitMap = ExtractBitMap<AccessType>

export type Cors     =  boolean | string[] |  string  |  RegExp
export type CorsType = 'boolean' | 'array' | 'string' | 'regex'

export type TimestampType  = typeof timestamps[keyof typeof timestamps]
type TimestampTimes<DateType = Date>  = { [T in TimestampType as `${T}Time`]+?: DateType }
type TimestampCounts = { [T in TimestampType as `${T}Count`]+?: number }
type TimestampHTML   = { [T in TimestampType as `${T}Time`]+?:  string }

export type GetOptions    = { idKey?: IDOf<UserDef>, timestamp?: TimestampType, ignoreCounter?: boolean } & SQLOptions<UserDef>
export type UpdateOptions = { idKey?: IDOf<UserDef>, reset?: boolean, counter?: TimestampType } & SQLOptions<UserDef>