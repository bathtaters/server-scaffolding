import type { sqlTypes, sqlSuffixes, ifExistsBehaviors, foreignKeyActions } from './db'
  
export type SQLType   = typeof sqlTypes   [keyof typeof sqlTypes   ]
export type SQLSuffix = typeof sqlSuffixes[keyof typeof sqlSuffixes]
export type SQLTypeFull = `${SQLType}${SQLSuffix | ""}`
export type IfExistsBehavior = typeof ifExistsBehaviors[keyof typeof ifExistsBehaviors]
export type ForeignKeyAction = typeof foreignKeyActions[keyof typeof foreignKeyActions]