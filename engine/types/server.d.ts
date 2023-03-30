import http from 'http'
import GracefulExit from "express-graceful-exit"
import { LogLevels } from "./log"

export type GracefulExitConfig = Omit<GracefulExit.Configuration, 'logger'> & { logger: LogLevels }

export type ServerInfo = {
    isClosing?: boolean,
    isTerminating?: boolean,
    listener: null | http.Server,
    terminateServer: () => Promise<any>,
}