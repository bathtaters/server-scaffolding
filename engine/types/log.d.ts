export type LogLevels = typeof logLevels[keyof typeof logLevels]
export type HttpLog   = typeof   httpLog[keyof typeof httpLog]
export type NoLog     = typeof     noLog[keyof typeof noLog]

export type LogObject = {
    [x: string]: any,
    
    address?: string,
    port?: number,
    timestamp?: string | { full: string, short: string },
    
    level?: LogLevels,
    label?: string,
    message?: string,

    code?: string | number,
    errno?: number,
    stack?: string,
    syscall?: string,
}



export const logLevels = {
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
    // Disable log
    none:   'none',
    silent: 'silent',
} as const