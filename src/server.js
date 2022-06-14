// Dependencies
require('dotenv').config()
const express = require('express')
const path = require('path')
const exitMiddleware = require('express-graceful-exit').middleware
const initServer = require('./services/init.services')
const errorMissing = require('./config/constants/error.messages').missing
const meta = require('./config/meta')
 
// Basics
const server = express()
server.set('trust proxy', true)
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'pug')

// Middleware
server.use(exitMiddleware(server))
server.use(express.json())
server.use(express.urlencoded({ extended: false }))
server.use(express.static(path.join(__dirname, '..', 'public')));
server.use('/api', require('./middleware/cors.middleware'))
server.use(`/${meta.protectedPrefix}`, require('./middleware/auth.middleware').initAuth())
require('./middleware/log.middleware')(server)
server.use(require('./middleware/common.middleware'))

// API Routes
server.use('/api', require('./routes/api.routes'))

// GUI Routes
server.use(`/${meta.protectedPrefix}`, require('./routes/gui.routes'))
server.use(`/${meta.protectedPrefix}${meta.urls.users}`, require('./routes/users.routes'))

// Errors
server.use((_,__,next) => next(errorMissing()))
server.use(require('./middleware/error.middleware'))

// Start server
initServer(server)
