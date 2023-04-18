import type express from 'express'
import type { ParamsDictionary, Query as ParsedQuery } from 'express-serve-static-core'

// TODO -- Implement stricter typing with routes and middleware

export type GuiHandler<Params extends object = {}> = express.RequestHandler<Params, any, {},   {}>
export type FormHandler<Body  extends object = {}> = express.RequestHandler<{},     any, Body, {}>

export type Request<
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  Query extends ParsedQuery = ParsedQuery,
  Locals extends Record<string, any> = Record<string, any>
> = express.Request<Params,ResBody,ReqBody,Query,Locals>

export type Response<
  ResBody = any,
  Locals extends Record<string, any> = Record<string, any>
> = express.Response<ResBody,Locals>

export type Next = express.NextFunction

export type Middleware = <
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  Query extends ParsedQuery = ParsedQuery,
  Locals extends Record<string, any> = Record<string, any>
>(
  req: Request<Params,ResBody,ReqBody,Query,Locals>,
  res: Response<ResBody,Locals>,
  next: Next,
) => void