import type { Middleware, Response as Res } from '../types/express.d'
import { httpLog } from '../types/log'
import httpLogger from 'morgan'
import { randomUUID } from 'crypto'
import logger, { stream } from '../libs/log'
import { now } from '../libs/date'
import { httpHdr, httpReq, httpRes } from '../utils/http.utils'
import { httpDebug, silent, httpMessage } from '../config/log.cfg'
import { definitions } from '../config/settings.cfg'

const isMember = <E extends string>(enumArray: E[], text: string): text is E => (enumArray as string[]).includes(text)

export default function loadLogMiddleware(httpFormat?: string): Middleware {
  // No Middleware
  if (!httpFormat) httpFormat = typeof process.env.LOG_HTTP === 'string' ? process.env.LOG_HTTP : definitions.LOG_HTTP.default
  if (!httpFormat || isMember(silent, httpFormat)) return (req,res,next) => next()

  if (!isMember(Object.values(httpLog), httpFormat)) throw new Error(`Invalid HTTP Format for log middleware: ${httpFormat}`)

  // Normal Middleware
  if (!isMember(httpDebug, httpFormat)) {
    logger.verbose(httpMessage(httpFormat))
    return httpLogger(httpFormat, { stream })
  }

  // Debug Middleware
  logger.log(process.env.NODE_ENV === 'production' ? 'warn' : 'info', httpMessage())

  return function debugLogger(req, res, next) {
    /* REQUEST */
    const start = now(), id = randomUUID()
    logger.http(httpHdr(req, 'Request') + httpReq(id, req))
  
    /* RESPONSE */
    res._endSkipLog = res.end
    res.end = (arg1: Function | any, arg2?: Function | BufferEncoding, arg3?: () => void) => {

      const enc = typeof arg2 === 'string' && arg2 ? arg2 : undefined
      logger.http(
        httpHdr(req, 'Response') +
        httpRes(id, start, arg1, enc, res.getHeaders(), res.statusCode)
      )

      return res._endSkipLog(arg1, arg2 as any, arg3) as any
    }
  
    return next()
  }
}


// Add _endSkipLog to Response object
declare global {
  namespace Express {
    interface Response {
      _endSkipLog: Res['end'];
    }
  }
}