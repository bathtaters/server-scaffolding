import type { Request, Middleware } from '../types/express.d'
import type { AccessBitMap } from '../types/Users.d'
import { Role } from '../types/Users'
import cors, { CorsOptionsDelegate } from 'cors'
import { Passport } from 'passport'
import { Strategy } from 'passport-http-bearer'
import Users from '../models/Users'
import { authorizeBearer } from '../services/auth.services'
import { noModelAccess, noAccess } from '../config/errors.engine'
  
const passport = new Passport()

const modelAuth = (modelName: string, accessType?: AccessBitMap): Middleware =>
  (req, _, next) => 
    req.isAuthenticated() && req.user.access?.intersects(accessType, modelName) ?
      next() : next(noModelAccess(modelName, accessType?.toString()))

const getCors: CorsOptionsDelegate<Request> = (req, next) =>
  !req.isAuthenticated() ? next(noAccess()) :
    next(null, {
      credentials: true,
      methods: ['GET','POST','PUT','DELETE'],
      origin: req.user.cors,
    })

export default function corsMiddleware(modelName?: string, accessType?: AccessBitMap) {
  passport.use('api', new Strategy(authorizeBearer(Users, Role.map.api)))

  const bearerAuth = passport.authenticate('api', { session: false })

  return modelName ?
    [bearerAuth, modelAuth(modelName, accessType), cors(getCors)] :
    [bearerAuth, cors(getCors)]
}
