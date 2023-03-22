// Process.Env Types
export const nodeEnv = ['development','secure-dev','production','test'] as const
export const logType = ['error','warn','info','http','verbose'] as const
export const httpLog = ['tiny','short','dev','common','combined','debug'] as const
export const noLog = ['none','silent'] as const // Disable log

export type NodeEnv = typeof nodeEnv[number]
export type LogType = typeof logType[number]
export type HttpLog = typeof httpLog[number]
export type NoLog = typeof noLog[number]

// Declare process.env type
type ProcessEnvValue = string | number | boolean | undefined

export interface EnvSettings {
    NODE_ENV: NodeEnv;
    port: number;
    LOG_CONSOLE: LogType | NoLog;
    LOG_FILE: LogType | NoLog;
    LOG_HTTP: HttpLog | NoLog;
    TRUST_PROXY: number | boolean | string;
    SESSION_SECRET: string;
    DB_SECRET: string;
    DB_DIR?: string;
    LOG_DIR?: string;
}

declare global {
    namespace NodeJS {
        interface ProcessEnv extends Record<EnvSettings, ProcessEnvValue> {
            NODE_APP_INSTANCE: ProcessEnvValue;
        }
    }
}