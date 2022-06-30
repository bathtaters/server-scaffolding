// Constants
const { rootPath } = require('../config/meta')
const urls = require('../config/urls.cfg')
// Module Dependencies
const express = require('express')
const { join } = require('path')
const startServer = require('./services/init.services')
const customServer = require('../server.init')
const { notRoute } = require('./utils/common.utils')
// Middleware
const exitMiddleware = require('express-graceful-exit').middleware
const authMiddleware = require('./middleware/auth.middleware').initAuth()
const logMiddleware  = require('./middleware/log.middleware')
const errorMiddleware  = require('./middleware/error.middleware')
// Routes
const apiRoutes   = require('./routes/api.routes')
const guiRoutes   = require('./routes/gui.routes')
const adminRoutes = require('./routes/admin.routes')
const rootRoutes  = require('./routes/root.routes')
 

// Server Setup
const server = express()
server.set('trust proxy', 1)
server.set('views', [join(rootPath, 'src', 'views'), join(rootPath, 'src', 'internal', 'views')])
server.set('view engine', 'pug')
customServer.setup && customServer.setup(server)

// Server-level Middleware
server.use(exitMiddleware(server))
server.use(express.json())
server.use(express.urlencoded({ extended: false }))
server.use(express.static(join(rootPath, 'public')))
server.use('/', express.static(join(rootPath, 'public', 'root')))
server.use(notRoute(urls.api.prefix), authMiddleware)
customServer.middleware && customServer.middleware(server)
server.use(logMiddleware())

// Routes
customServer.routes && customServer.routes(server)
server.use('/',                   rootRoutes)
server.use(urls.api.prefix,       apiRoutes)
server.use(urls.gui.basic.prefix, guiRoutes)
server.use(urls.gui.admin.prefix, adminRoutes)

// Error Handling
server.use(urls.api.prefix, errorMiddleware.json)
server.use(errorMiddleware.page)

// Start server
startServer(server)
