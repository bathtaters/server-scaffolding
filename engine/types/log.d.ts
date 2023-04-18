import type { logLevels, httpLog, noLog } from './log'

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