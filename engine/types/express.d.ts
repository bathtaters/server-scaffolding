import express from 'express'

declare global {
  namespace Express {
    interface Request {
      session?: any;
      user?: any;
    }

    interface User {
      username: string,
      access: number,
    }
  }
}

export type GuiHandler<Params extends object = {}> = express.RequestHandler<Params, any, {},   {}>
export type FormHandler<Body  extends object = {}> = express.RequestHandler<{},     any, Body, {}>

export type Middleware = <
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = QueryString.ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
>(
  req: express.Request<P,ResBody,ReqBody,ReqQuery,Locals>,
  res: express.Response<ResBody,Locals>,
  next: express.NextFunction
) => void