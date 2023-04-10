import { format } from 'winston'
import { msAgo } from '../libs/date'
import { Request } from 'express'

// Format HTTP messages
const prettyJSON = format.prettyPrint()
const formatObject = (obj: any) => {
  const pretty = prettyJSON.transform(obj, { colorize: true })
  return typeof pretty === 'boolean' ? '' : pretty[Symbol.for('message')] as string
}

// Convert buffer data for debug log
const decodeBuffer = (type: string, data: any, enc?: BufferEncoding) => 
  !Buffer.isBuffer(data) || !type ? data :
  type.includes('html') ? `[HTML: ${data.byteLength.toLocaleString()} bytes]` :
  type.includes('json') ? JSON.parse(data.toString(enc)) :
  /* other: */ data.toString(enc)


export const httpHdr = ({ method, protocol, subdomains, hostname, originalUrl }: Request, title = 'HTTP') => 
  `\x1b[35m${method} ${title.toUpperCase()}\x1b[0m ${protocol}://${subdomains.concat('').join('.')}${hostname}${originalUrl} `

export const httpReq = (id: string, { headers, params, body, session, user, ips, ip, cookies, signedCookies }: Request) =>
  formatObject({
    id,
    headers,
    params,
    body: { ...body },
    cookies: (session ? [{ type: 'session', ...session.cookie }] : []).concat(cookies || []).concat(signedCookies || []),
    user,
    ips: ips.concat(ip)
  })

export const httpRes = (id: string, start: number, data: any, enc: BufferEncoding | undefined, headers: Record<string,any>, status: number) =>
  formatObject({
    id,
    headers: { ...headers },
    timeMs: msAgo(start),
    status,
    data: decodeBuffer(headers['content-type'], data, enc),
  })
