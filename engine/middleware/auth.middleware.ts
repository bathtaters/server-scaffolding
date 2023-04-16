import type { ModelsType, UsersUI } from '../types/Users'
import type { Middleware } from '../types/express'

import expressSession from 'express-session'
import flash from 'connect-flash'
import { use, serializeUser, deserializeUser, initialize, session, authenticate } from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'

import Users from '../models/Users'
import { hasModelAccess } from '../utils/users.model'
import { hasAccess, accessInt } from '../utils/users.access'
import { authorizeUser, storeUser, loadUser, sessionOptions } from '../services/auth.services'
import { noModel } from '../config/errors.engine'
import { loginAccess as loginAccessArray } from '../config/users.cfg'

const loginAccess = accessInt(loginAccessArray) // TODO: Use BitMap


export function initAuth() {
  use(new LocalStrategy(authorizeUser(Users, loginAccess)))
  serializeUser(storeUser(Users))
  deserializeUser(loadUser(Users, 'gui'))

  return [
    expressSession(sessionOptions),
    flash(),
    initialize(),
    session(),
  ]
}

export const checkAuth = (redirectURL: string, accessLevel: number): Middleware => // TODO: Use BitMap
  (req, res, next) => {
    if (req.isAuthenticated() && hasAccess(req.user.access, accessLevel)) return next()
    res.redirect(redirectURL)
  }

export const checkModel = (redirectURL: string, modelName: string, accessType: ModelAccess): Middleware =>
  (req, res, next) => {
    const access = typeof accessType === 'function' ? accessType(req) : accessType
    if (hasModelAccess(req.user?.models, modelName, access)) return next()
    redirectURL ? res.redirect(redirectURL) : next(noModel(modelName, access))
  }
    
export const forwardOnAuth = (redirectURL: string, accessLevel: number): Middleware => // TODO: Use BitMap
  (req, res, next) => {
    if (req.isAuthenticated() && hasAccess(req.user.access, accessLevel)) return res.redirect(redirectURL)
    next()
  }
    
export const login = (landingURL: string, loginURL: string): Middleware =>
  authenticate('local', {
    successRedirect: landingURL,
    failureRedirect: loginURL,
    failureFlash: true,
  })
    
export const logout = (redirectURL: string): Middleware => (req, res, next) =>
  req.logOut((err) => err ? next(err) : res.redirect(redirectURL))

type ModelAccess = ModelsType | ((req: Express.Request) => ModelsType)

// Define User type for Express middleware
declare global {
  namespace Express {
    interface User extends UsersUI {}
  }
}
