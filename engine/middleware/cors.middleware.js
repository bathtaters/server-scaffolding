const cors = require('cors')
const passport = require('passport')
const BearerStrategy = require('passport-http-bearer').Strategy
const Users = require('../models/Users')
const { authorizeBearer } = require('../services/auth.services')
const { hasModelAccess } = require('../utils/users.utils')
const { access } = require('../config/users.cfg')
const errors = require('../config/errors.engine')

passport.use(new BearerStrategy(authorizeBearer(Users, access.api)))

const bearerAuth = passport.authenticate('bearer', { session: false })
  
const modelAuth = (modelName, accessType) => (req, _, next) => 
  req.isAuthenticated() && hasModelAccess(req.user.models, modelName, accessType) ?
    next() : next(errors.noModel(modelName, accessType))

const getCors = (req, next) => !req.isAuthenticated() ? next(errors.noAccess()) : next(null, {
  credentials: true,
  methods: ['GET','POST','PUT','DELETE'],
  origin: req.user.cors,
})

module.exports = (modelName = null, accessType) => modelName ?
  [bearerAuth, modelAuth(modelName, accessType), cors(getCors)] :
  [bearerAuth, cors(getCors)]
