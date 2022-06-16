// Module Dependencies
require('dotenv').config()
const express = require('express')
const join = require('path').join
const initServer = require('./services/init.services')
// Middleware
const exitMiddleware = require('express-graceful-exit').middleware
const authMiddleware = require('./internal/middleware/auth.middleware').initAuth()
const logMiddleware  = require('./internal/middleware/log.middleware')
const commonMiddleware = require('./middleware/common.middleware')
const errorMiddleware  = require('./internal/middleware/error.middleware')
// Routes
const apiRoutes   = require('./internal/routes/api.routes')
const guiRoutes   = require('./internal/routes/gui.routes')
const adminRoutes = require('./internal/routes/admin.routes')
const rootRoutes  = require('./internal/routes/root.routes')
// Constants
const urls = require('./config/urls.cfg')
const rootPath = require('./config/meta').rootPath
 

// Server Setup
const server = express()
server.set('trust proxy', 1)
server.set('views', join(rootPath, 'src', 'views'))
server.set('view engine', 'pug')

// Server-level Middleware
server.use(exitMiddleware(server))
server.use(express.json())
server.use(express.urlencoded({ extended: false }))
server.use(express.static(join(rootPath, 'public')))
server.use('/', express.static(join(rootPath, 'public', 'root')))
server.use(authMiddleware)
server.use(commonMiddleware)

// Log Middleware
server.use(logMiddleware())
server.use(urls.api.prefix,       logMiddleware(urls.api.prefix))
server.use(urls.gui.basic.prefix, logMiddleware(urls.gui.basic.prefix))
server.use(urls.gui.admin.prefix, logMiddleware(urls.gui.admin.prefix))
server.use(Object.values(urls.gui.root), logMiddleware('root'))

// Routes
server.use('/',                   rootRoutes)
server.use(urls.api.prefix,       apiRoutes)
server.use(urls.gui.basic.prefix, guiRoutes)
server.use(urls.gui.admin.prefix, adminRoutes)

// Error Handling
server.use(urls.api.prefix, errorMiddleware.json)
server.use(errorMiddleware.page)

// Start server
initServer(server)
