import http from "http"
import GracefulExit from "express-graceful-exit"
import { LogLevels } from "./log"

const processEvents = [
    'beforeExit', 'disconnect', 'exit', 'message',
    'multipleResolves', 'rejectionHandled', 'uncaughtException',
    'uncaughtExceptionMonitor', 'unhandledRejection', 'warning', 'worker',
] as const

export type ProcessEvents = typeof processEvents[number] | NodeJS.Signals


export type GracefulExitConfig = Omit<GracefulExit.Configuration, 'logger'> & { logger: LogLevels }

export type ServerInfo = {
    isClosing?: boolean,
    isTerminating?: boolean,
    listener: null | http.Server,
    terminateServer: () => Promise<any>,
}