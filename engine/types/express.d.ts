import type express from 'express'
import type { HttpError } from 'http-errors'

export type GuiHandler<Params extends object = {}> = express.RequestHandler<Params, any, {},   {}>
export type FormHandler<Body  extends object = {}> = express.RequestHandler<{},     any, Body, {}>

export type Request<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery extends QueryString.ParsedQs = QueryString.ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> = express.Request<P,ResBody,ReqBody,ReqQuery,Locals>

export type Response<
  ResBody = any,
  Locals extends Record<string, any> = Record<string, any>
> = express.Response<ResBody,Locals>

export type Next = express.NextFunction

export type Middleware = <
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery extends QueryString.ParsedQs = QueryString.ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
>(
  req: Request<P,ResBody,ReqBody,ReqQuery,Locals>,
  res: Response<ResBody,Locals>,
  next: Next,
) => void