export const access = Object.freeze({ api: 1, gui: 2, admin: 4, none: 0 })
export const models = Object.freeze({ read: 1, write: 2, none: 0 })

export const noModelAccessChar = '-' as const

export type AccessTypes = keyof typeof access
export type ModelsTypes = keyof typeof models
export type ModelsShort = typeof noModelAccessChar | 'r' | 'w' | 'rw'
export type AccessDB = number
export type ModelsDB = number

interface UsersBase {
    id: string, // hex
    username: string,
    confirm?: string,
    token: string, // hex
    cors: string,
    failCount?: int,
    failTime?: Date,
    guiCount?: int,
    guiTime?: Date,
    apiCount?: int,
    apiTime?: Date,
    locked: boolean,
}

export interface UsersDB extends UsersBase {
    access: AccessDB,
    models: ModelsDB,
    pwkey?: string, // hex
    salt?:  string, // hex
}

export interface UsersUI extends UsersBase {
    access?: Access[],
    models: ModelsShort,
    password?: boolean,
}