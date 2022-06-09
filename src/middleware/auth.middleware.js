const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

const Users = require('../models/_Users')
const { hasAccess } = require('../utils/users.utils')
const { authorizeUser, storeUser, loadUser, sessionOptions } = require('../services/auth.services')


exports.initAuth = () => {
  passport.use(new LocalStrategy(authorizeUser(Users)))
  passport.serializeUser(storeUser)
  passport.deserializeUser(loadUser(Users))

  return [
    session(sessionOptions),
    passport.initialize(),
    passport.session(),
  ]
}

exports.checkAuth = (redirectURL, accessLevel) => (req, res, next) => {
  if (req.isAuthenticated() && hasAccess(req.user.access, accessLevel)) return next()
  res.redirect(redirectURL)
}
    
exports.forwardOnAuth = (redirectURL, accessLevel) => (req, res, next) => {
  if (req.isAuthenticated() && hasAccess(req.user.access, accessLevel)) return res.redirect(redirectURL)
  next()
}
    
exports.login = (landingURL, loginURL) => passport.authenticate('local', {
  successRedirect: landingURL,
  failureRedirect: loginURL,
})
    
exports.logout = (redirectURL) => (req, res) => req.logOut((err) => err ? next(err) : res.redirect(redirectURL))
