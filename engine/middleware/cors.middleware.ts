import type { Request, Middleware } from '../types/express.d'
import type { ModelsType } from '../types/Users.d'
import { access } from '../types/Users'
import cors, { CorsOptionsDelegate } from 'cors'
import { use, authenticate } from 'passport'
import { Strategy } from 'passport-http-bearer'
import Users from '../models/Users'
import { authorizeBearer } from '../services/auth.services'
import { hasModelAccess } from '../utils/users.model'
import { noModel, noAccess } from '../config/errors.engine'

use(new Strategy(authorizeBearer(Users, access.api)))

const bearerAuth = authenticate('bearer', { session: false })
  
const modelAuth = (modelName: string, accessType?: ModelsType): Middleware =>
  (req, _, next) => 
    req.isAuthenticated() && hasModelAccess(req.user.models, modelName, accessType) ?
      next() : next(noModel(modelName, accessType))

const getCors: CorsOptionsDelegate<Request> = (req, next) =>
  !req.isAuthenticated() ? next(noAccess()) :
    next(null, {
      credentials: true,
      methods: ['GET','POST','PUT','DELETE'],
      origin: req.user.cors,
    })

export default function corsMiddleware(modelName?: string, accessType?: ModelsType) {
  return modelName ?
    [bearerAuth, modelAuth(modelName, accessType), cors(getCors)] :
    [bearerAuth, cors(getCors)]
}