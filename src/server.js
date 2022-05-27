// Dependencies
require('dotenv').config()
const express = require('express')
const path = require('path')
const createError = require('http-errors')
const cookieParser = require('cookie-parser')
const logger = require('./config/log.adapter')
const meta = require('./config/meta')
 
// Basics
const server = express()
require('./services/init.services')(server)
server.set('views', path.join(__dirname, 'views'))
server.set('view engine', 'pug')

// Middleware
server.use(express.json())
server.use(express.urlencoded({ extended: false }))
server.use(cookieParser())
server.use(express.static(path.join(__dirname, '..', 'public')));
server.use(require('./middleware/log.middleware'))
server.use(require('./middleware/unescape.middleware'))

// Routes
server.use(`/api/v${meta.apiVersion}`, require('./routes/api.routes'))
server.use(`/${meta.protectedPrefix}`, require('./routes/gui.routes'))

// Errors
server.use((_,__,next) => { next(createError(404)) })
server.use(require('./middleware/error.middleware'))

// Start server
const port = require('./config/meta').port
server.listen(port, () => logger.info(`Listening on port ${port}`));
