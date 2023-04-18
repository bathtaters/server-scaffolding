import type http from "http"
import type GracefulExit from "express-graceful-exit"
import type { processEvents } from "./server"
import type { LogLevels } from "./log.d"

export type ProcessEvents = typeof processEvents[number] | NodeJS.Signals

export type GracefulExitConfig = Omit<GracefulExit.Configuration, 'logger'> & { logger: LogLevels }

export type ServerInfo = {
    isClosing?: boolean,
    isTerminating?: boolean,
    listener: null | http.Server,
    terminateServer: () => Promise<any>,
}