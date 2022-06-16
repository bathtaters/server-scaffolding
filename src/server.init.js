function startup(server) {
  // Add code to execute just before server starts
}

function teardown() {
  // Add code to execute when server begins to shutdown
}

function setup(server) {
  // Add custom server settings/run-first middleware: server.set(setting, value)
}

function middleware(server) {
  // Add custom middleware: server.use(middleware)
}

function routes(server) {
  // Add custom route handlers: server.use(route, routeHandler)
}

module.exports = { setup, middleware, routes, startup, teardown }