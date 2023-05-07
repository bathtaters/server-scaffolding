import type { sqlTypes, sqlSuffixes, ifExistsBehaviors, foreignKeyActions, whereOp, whereLogic, whereNot, updateOps, whereOpPartial } from './db'
import type { OneOrNone, ExactlyOne, TypeOf } from './global.d'
import type { BitMapBase } from './BitMap'
  
export type SQLType   = typeof sqlTypes   [keyof typeof sqlTypes   ]
export type SQLSuffix = typeof sqlSuffixes[keyof typeof sqlSuffixes]
export type SQLTypeFull = `${SQLType}${SQLSuffix | ""}`
export type IfExistsBehavior = typeof ifExistsBehaviors[keyof typeof ifExistsBehaviors]
export type ForeignKeyAction = typeof foreignKeyActions[keyof typeof foreignKeyActions]

export type WhereOps = keyof typeof whereOp
export type WhereLogic = keyof typeof whereLogic
export type WhereNot = typeof whereNot

type WhereValue<T> = T | ExactlyOne<Record<WhereOps, T> | { [whereOpPartial]: T[] }>
export type WhereData<Schema extends Record<string,any>> =
    { [K in keyof Schema]+?: WhereValue<Schema[K]> } |
    ExactlyOne<
        Record<WhereLogic, WhereData<Schema>[]> &
        { [whereNot]: WhereData<Schema> }
    >
export type WhereDataValue<Schema extends Record<string,any>> =
    WhereValue<Schema[keyof Schema]> |
    WhereData<Schema>[] | WhereData<Schema> |
    undefined


export type UpdateOps<T = any> = {
    [K in keyof typeof updateOps]: keyof (typeof updateOps)[K]
}[TypeOf<T> & keyof typeof updateOps]


type UpdateValue<T> = T | ExactlyOne<Record<UpdateOps<T>, T>>
export type UpdateData<Schema extends Record<string,any>> = { [K in keyof Schema]+?: UpdateValue<Schema[K]> }
export type UpdateDataValue<Schema extends Record<string,any>> = UpdateValue<Schema[keyof Schema]>

export type AllOps = WhereOps | UpdateOps

export type SQLParams = Array<[string, any] | OneOrNone<Record<WhereLogic, SQLParams>>>