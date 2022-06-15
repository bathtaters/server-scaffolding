const session = require('express-session')
const flash = require('connect-flash')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

const Users = require('../models/_Users')
const { hasAccess, accessInt } = require('../utils/users.utils')
const { authorizeUser, storeUser, loadUser, sessionOptions } = require('../services/auth.services')
const loginAccess = accessInt(require('../config/constants/users.cfg').loginAccess)


exports.initAuth = () => {
  passport.use(new LocalStrategy(authorizeUser(Users, loginAccess)))
  passport.serializeUser(storeUser(Users))
  passport.deserializeUser(loadUser(Users))

  return [
    session(sessionOptions),
    flash(),
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
  failureFlash: true,
})
    
exports.logout = (redirectURL) => (req, res) => req.logOut((err) => err ? next(err) : res.redirect(redirectURL))
