// Dependencies
require('dotenv').config()
const express = require('express')
const path = require('path')
const createError = require('http-errors')
const logger = require('./config/log.adapter')
const meta = require('./config/meta')
 
// Basics
const server = express()
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'pug')

// Middleware
server.use(express.json())
server.use(express.urlencoded({ extended: false }))
server.use(express.static(path.join(__dirname, '..', 'public')));
server.use(require('morgan')(process.env.MORGAN_FMT || 'short'))
server.use('/api', require('./middleware/cors.middleware'))
server.use(`/${meta.protectedPrefix}`, require('./middleware/auth.middleware').initAuth())
server.use(require('./middleware/common.middleware'))

// API Routes
server.use('/api', require('./routes/api.routes'))

// GUI Routes
server.use(`/${meta.protectedPrefix}`, require('./routes/gui.routes'))
server.use(`/${meta.protectedPrefix}${meta.urls.users}`, require('./routes/users.routes'))

// Errors
server.use((_,__,next) => { next(createError(404)) })
server.use(require('./middleware/error.middleware'))

// Start server
require('./services/init.services')(server).then(() => 
  server.listen(meta.port, () => logger.info(`Listening on port ${meta.port}`))
)
