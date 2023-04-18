export const processEvents = [
    'beforeExit', 'disconnect', 'exit', 'message',
    'multipleResolves', 'rejectionHandled', 'uncaughtException',
    'uncaughtExceptionMonitor', 'unhandledRejection', 'warning', 'worker',
] as const