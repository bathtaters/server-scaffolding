export const logType = {
    error:   'error',
    warn:    'warn',
    info:    'info',
    http:    'http',
    verbose: 'verbose',
} as const

export const httpLog = {
    tiny:     'tiny',
    short:    'short',
    dev:      'dev',
    common:   'common',
    combined: 'combined',
    debug:    'debug',
} as const

export const noLog = {
    none:   'none',
    silent: 'silent',
} as const // Disable log

export type LogType = typeof logType[keyof typeof logType]
export type HttpLog = typeof httpLog[keyof typeof httpLog]
export type NoLog   = typeof   noLog[keyof typeof noLog]
