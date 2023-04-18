import type { nodeEnv, settingsActions } from "./settings"
import type { LogLevels, HttpLog, NoLog } from "./log.d"
import type { FormDefinition } from "./gui.d"

export type NodeEnv = typeof nodeEnv[number]

export type SettingsActionKeys = keyof typeof settingsActions
export type SettingsActions = typeof settingsActions[keyof typeof settingsActions]


type ProcessEnvValue = string | number | boolean | undefined

export type EnvParsed = {
    NODE_ENV: NodeEnv,
    port: number,
    LOG_CONSOLE: LogLevels | NoLog,
    LOG_FILE: LogLevels | NoLog,
    LOG_HTTP: HttpLog | NoLog,
    TRUST_PROXY: number | boolean | string,
    SESSION_SECRET: string,
    DB_SECRET: string,
    DB_DIR?: string,
    LOG_DIR?: string,
}

export type EnvObject = { [P in keyof EnvParsed & string]+?: string }
export type SettingsDefinitions = Record<keyof EnvParsed & string, FormDefinition>


export type SettingsActionFunc = (settings: Partial<EnvObject>, session: any) => Promise<void | (() => void)>


// Override process.env type
declare global {
    namespace NodeJS {
        interface ProcessEnv extends EnvObject {}
    }
}
