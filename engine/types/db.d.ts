import type { sqlTypes, sqlSuffixes, ifExistsBehaviors, foreignKeyActions, whereOp, whereLogic, whereNot } from './db'
import type { OneOrNone, ExactlyOne } from './global.d'
import type { SchemaBase } from './Model.d'
  
export type SQLType   = typeof sqlTypes   [keyof typeof sqlTypes   ]
export type SQLSuffix = typeof sqlSuffixes[keyof typeof sqlSuffixes]
export type SQLTypeFull = `${SQLType}${SQLSuffix | ""}`
export type IfExistsBehavior = typeof ifExistsBehaviors[keyof typeof ifExistsBehaviors]
export type ForeignKeyAction = typeof foreignKeyActions[keyof typeof foreignKeyActions]

export type WhereOps = keyof typeof whereOp
export type WhereLogic = keyof typeof whereLogic
export type WhereNot = typeof whereNot

type WhereValue<T> = T | ExactlyOne<Record<WhereOps, T>>
export type WhereData<Schema extends SchemaBase> =
    { [K in keyof Schema]+?: WhereValue<Schema[K]> } |
    ExactlyOne<
        Record<WhereLogic, WhereData<Schema>[]> &
        { [whereNot]: WhereData<Schema> }
    >
export type WhereDataValue<Schema extends SchemaBase> =
    WhereValue<Schema[keyof Schema]> |
    WhereData<Schema>[] | WhereData<Schema> |
    undefined

export type SQLParams = Array<[string, any] | OneOrNone<Record<WhereLogic, SQLParams>>>