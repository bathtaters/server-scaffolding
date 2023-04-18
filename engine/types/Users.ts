// TODO: RENAME ACCESS => PRIVLEGES && MODELS => ACCESS

export const noAccess = 'none' as const
export const noModelAccessChar = '-' as const
export const allModelsKey = 'default' as const

export const access = {
    api:   0x1,
    gui:   0x2,
    admin: 0x4,
    [noAccess]: 0x0,
} as const

export const models = {
    read:  0x1,
    write: 0x2,
    [noAccess]: 0x0,
} as const

export const modelsStrings = {
    read:  'r',
    write: 'w',
    [noAccess]: noModelAccessChar,
} as const

export const timestamps = {
    gui:  'gui',
    api:  'api',
    fail: 'fail',
} as const
