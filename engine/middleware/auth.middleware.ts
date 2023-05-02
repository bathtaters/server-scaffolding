import type { AccessBitMap, RoleType, UsersUI } from '../types/Users.d'
import type { Middleware } from '../types/express.d'
import { anyAccess, timestamps } from '../types/Users'

import expressSession from 'express-session'
import flash from 'connect-flash'
import { Passport } from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'

import Users from '../models/Users'
import { authorizeUser, storeUser, loadUser, sessionOptions } from '../services/auth.services'
import { noModelAccess } from '../config/errors.engine'
import { loginRoles } from '../config/users.cfg'

const passport = new Passport()

export function initAuth() {
  passport.use('gui', new LocalStrategy(authorizeUser(Users, loginRoles)))
  passport.serializeUser(storeUser(Users))
  passport.deserializeUser(loadUser(Users, timestamps.gui))

  return [
    expressSession(sessionOptions),
    flash(),
    passport.session(),
  ]
}

export const checkAuth = (redirectURL: string, role: RoleType): Middleware =>
  (req, res, next) => {
    if (req.isAuthenticated() && role.intersects(req.user.role)) return next()
    res.redirect(redirectURL)
  }

export const checkModel = (redirectURL: string | null, modelName: string, accessType: ModelAccess = anyAccess): Middleware =>
  (req, res, next) => {
    const access = typeof accessType === 'function' ? accessType(req) : accessType
    if (req.user?.access?.intersects(access, modelName)) return next()
    redirectURL ? res.redirect(redirectURL) : next(noModelAccess(modelName, access?.toString()))
  }
    
export const forwardOnAuth = (redirectURL: string, role: RoleType): Middleware =>
  (req, res, next) => {
    if (req.isAuthenticated() && role.intersects(req.user.role)) return res.redirect(redirectURL)
    next()
  }
    
export const login = (landingURL: string, loginURL: string): Middleware =>
  passport.authenticate('gui', {
    successRedirect: landingURL,
    failureRedirect: loginURL,
    failureFlash: true,
  })
    
export const logout = (redirectURL: string): Middleware => (req, res, next) =>
  req.logOut((err) => err ? next(err) : res.redirect(redirectURL))

type ModelAccess = AccessBitMap | ((req: Express.Request) => AccessBitMap)

// Define User type for Express middleware
declare global {
  namespace Express {
    interface User extends UsersUI {}
  }
}
