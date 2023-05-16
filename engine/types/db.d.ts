import type { sqlTypes, sqlSuffixes, ifExistsBehaviors, foreignKeyActions, whereOp, whereLogic, whereNot, updateOps, whereOpPartial } from './db'
import type { OneOrNone, ExactlyOne, TypeOf } from './global.d'

/** Convert SQLTypes to Types */
type TypeOfSQL<S extends SQLType | undefined> = 
    S extends never ? any :
    S extends typeof sqlTypes['Text']  ? string :
    S extends typeof sqlTypes['Int']   ? number :
    S extends typeof sqlTypes['Float'] ? number :
    S extends typeof sqlTypes['Blob']  ? Buffer :
        never

export type SQLType   = typeof sqlTypes   [keyof typeof sqlTypes   ]
export type SQLSuffix = typeof sqlSuffixes[keyof typeof sqlSuffixes]
export type SQLTypeFull = `${SQLType}${SQLSuffix | ""}`
export type IfExistsBehavior = typeof ifExistsBehaviors[keyof typeof ifExistsBehaviors]
export type ForeignKeyAction = typeof foreignKeyActions[keyof typeof foreignKeyActions]

/** Input Type for CREATE TABLE operation */
export type CreateSchema = { [columnName: string]: SQLTypeFull | false | undefined }

export type WhereOps = keyof typeof whereOp
export type WhereLogic = keyof typeof whereLogic
export type WhereNot = typeof whereNot

type WhereValue<T> = T | ExactlyOne<Record<WhereOps, T> | { [whereOpPartial]: T[] }>
export type WhereData<Schema extends Record<string,any>> =
    { [K in keyof Schema]+?: WhereValue<Schema[K]> } |
    OneOrNone<
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



/** Extract Type from SQLTypeFull string */
export type ExtractDBType<D extends SQLTypeFull | undefined> = 
    D extends undefined ? never : TypeOfSQL<BaseOfSQL<D>> |
    (DBIsOptional<D> extends true ? null : never)

/** Extract SQLBase string from SQLTypeFull */
type BaseOfSQL<D extends SQLTypeFull | undefined> =
    D extends `${infer T}${SQLSuffix | ''}${SQLSuffix | ''}` ?
        T extends SQLType ? T : never : never

/** Extract if SQL is optional from SQLTypeFull */
export type DBIsOptional<S extends SQLTypeFull | undefined> =
    S extends `${SQLType}${string}${SQLSuffix}${string}` ?
        false : true