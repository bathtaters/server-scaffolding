import type { Role, ModelAccess, timestamps } from "./Users"
import type { IDOf, SQLOptions } from "./Model.d"
import type { BitMapBase, FlagType } from "./BitMap"
import type { BitMapObjBase, ExtractBitMap, ObjDefType, ObjFlagType, ObjKeyType } from "./BitMapObj.d"
import type { definition } from "../config/users.cfg"

export type UserDef = typeof definition

export type RoleType     = BitMapBase<FlagType<typeof Role>>
export type AccessType   = BitMapObjBase<ObjKeyType<typeof ModelAccess>, ObjFlagType<typeof ModelAccess>, ObjDefType<typeof ModelAccess>>
export type AccessBitMap = ExtractBitMap<typeof ModelAccess>

export type Cors = boolean | string[] | string | RegExp

export type TimestampType  = typeof timestamps[keyof typeof timestamps]
type TimestampTimes<DateType = Date>  = { [T in TimestampType as `${T}Time`]+?: DateType }
type TimestampCounts = { [T in TimestampType as `${T}Count`]+?: number }
type TimestampHTML   = { [T in TimestampType as `${T}Time`]+?:  string }

export type GetOptions    = { idKey?: IDOf<UserDef>, timestamp?: TimestampType, ignoreCounter?: boolean } & SQLOptions<UserDef>
export type UpdateOptions = { idKey?: IDOf<UserDef>, reset?: boolean, counter?: TimestampType } & SQLOptions<UserDef>