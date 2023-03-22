import express from 'express'

declare global {
  namespace Express {
    interface User {
      username: string,
      access: number,
    }
  }
}

export declare type GuiHandler<Params extends object = {}> = express.RequestHandler<Params, any, {},   {}>
export declare type FormHandler<Body  extends object = {}> = express.RequestHandler<{},     any, Body, {}>
