// Constants
import { urlCfg, guiCfg, userServer } from './src.import'
import { staticRootPath } from './config/meta'
import { trustProxy, preflightCors } from './config/server.cfg'
import { jsonPaths } from './config/users.cfg'

// Module Dependencies
import express from 'express'
import { join } from 'path'
import helmet from 'helmet'
import cors from 'cors'
import initializeServer from './services/init.services'
import { exceptRoute } from './utils/common.utils'

// Middleware
import { middleware as exitMiddleware } from 'express-graceful-exit'
import { apiLimiter, guiLimiter } from './middleware/rateLimit.middleware'
import { initAuth } from './middleware/auth.middleware'
import csrfMiddleware from './middleware/csrf.middleware'
import logMiddleware from './middleware/log.middleware'
import { jsonError, htmlError } from './middleware/error.middleware'

// Routes
import apiRoutes from './routes/api.routes'
import guiRoutes from './routes/gui.routes'
import adminRoutes from './routes/admin.routes'
import rootRoutes from './routes/root.routes'
 

// Server Setup
const server = express()
server.set('trust proxy', trustProxy)
server.set('views', [join(staticRootPath, 'src', 'views'), join(staticRootPath, 'engine', 'views')])
server.set('view engine', 'pug')
if (process.env.NODE_ENV === 'production') server.disable('x-powered-by')
userServer.setup && userServer.setup(server)

// Server-level Middleware
server.use(exitMiddleware(server))
server.use(exceptRoute(urlCfg.api.prefix, helmet({ contentSecurityPolicy: { directives: guiCfg.guiCSP } })))
server.use(urlCfg.api.prefix, helmet())
server.use(express.json())
server.use(express.urlencoded({ extended: false }))
server.use(express.static(join(staticRootPath, 'public')))
server.use('/', express.static(join(staticRootPath, 'public', 'root')))
server.use(express.static(join(staticRootPath, 'engine', 'public')))
server.options(urlCfg.api.prefix+'/*', cors(preflightCors))
server.use(urlCfg.api.prefix, apiLimiter)
server.use(exceptRoute(urlCfg.api.prefix, guiLimiter))
server.use(exceptRoute(urlCfg.api.prefix, initAuth()))
csrfMiddleware && server.use(exceptRoute(urlCfg.api.prefix, csrfMiddleware))
userServer.middleware && userServer.middleware(server)
server.use(logMiddleware())

// Routes
userServer.routes && userServer.routes(server)
server.use('/',                   rootRoutes)
server.use(urlCfg.api.prefix,       apiRoutes)
server.use(urlCfg.gui.basic.prefix, guiRoutes)
server.use(urlCfg.gui.admin.prefix, adminRoutes)

// Error Handling
server.use([urlCfg.api.prefix, ...(guiCfg.jsonPaths || []), ...(jsonPaths || [])], ...jsonError)
server.use(...htmlError)

// Start server
initializeServer(server)

export default server