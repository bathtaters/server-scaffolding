import { LogLevels, HttpLog } from "./log.d"

export const nodeEnv = ['development','secure-dev','production','test'] as const
export type NodeEnv = typeof nodeEnv[number]

const processEvents = [
    'beforeExit', 'disconnect', 'exit', 'message',
    'multipleResolves', 'rejectionHandled', 'uncaughtException',
    'uncaughtExceptionMonitor', 'unhandledRejection', 'warning', 'worker',
] as const
export type ProcessEvents = typeof processEvents[number] | NodeJS.Signals


// Declare process.env type
type ProcessEnvValue = string | number | boolean | undefined

export interface EnvSettings {
    NODE_ENV: NodeEnv;
    port: number;
    LOG_CONSOLE: LogLevels | NoLog;
    LOG_FILE: LogLevels | NoLog;
    LOG_HTTP: HttpLog | NoLog;
    TRUST_PROXY: number | boolean | string;
    SESSION_SECRET: string;
    DB_SECRET: string;
    DB_DIR?: string;
    LOG_DIR?: string;
}

export type EnvObject = Record<keyof EnvSettings, ProcessEnvValue>

declare global {
    namespace NodeJS {
        interface ProcessEnv extends EnvObject {
            NODE_APP_INSTANCE: ProcessEnvValue;
        }
    }
}