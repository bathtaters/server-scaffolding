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