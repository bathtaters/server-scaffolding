const express = require('express')
const path = require('path')
const createError = require('http-errors')
const cookieParser = require('cookie-parser')

const initServer = require('./services/init.services')
const logger = require('./config/log.adapter')
const errorMw = require('./middleware/error.middleware')
const port = require('./config/meta').port

const baseRouter = require('./routes/base.routes')

const server = express()
// app.set('views', path.join(__dirname, 'views'))
// app.set('view engine', 'pug')

server.use(logger.middleware)
server.use(express.json())
server.use(express.urlencoded({ extended: false }))
server.use(cookieParser())
// server.use(express.static(path.join(__dirname, '..', 'public')));

server.use('/', baseRouter)

server.use((_,__,next) => { next(createError(404)) })
server.use(errorMw)

initServer()

server.listen(port, () => logger.info(`Listening on port ${port}`));
