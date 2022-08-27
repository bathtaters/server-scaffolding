function startup(server: Express.Application) {
  // Add code to execute just before server starts
}

function teardown() {
  // Add code to execute when server begins to shutdown
}

function setup(server: Express.Application) {
  // Add custom server settings/run-first middleware: server.set(setting, value)
}

function middleware(server: Express.Application) {
  // Add custom middleware: server.use(middleware)
}

function routes(server: Express.Application) {
  // Add custom route handlers: server.use(route, routeHandler)
}

export { setup, middleware, routes, startup, teardown }