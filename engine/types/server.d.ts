import GracefulExit from "express-graceful-exit";
import { LogLevels } from "./log";

export type GracefulExitConfig = Omit<GracefulExit.Configuration, 'logger'> & { logger: LogLevels }

export type ProcessInfo = {
    isClosing?: boolean,
    isTerminating?: boolean,
    terminateServer: () => Promise<any>
}