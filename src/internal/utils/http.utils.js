const { msAgo } = require('../libs/date')

// Format HTTP messages
const prettyJSON = require('winston').format.prettyPrint()
const formatObject = (obj) => prettyJSON.transform(obj, { colorize: true })[Symbol.for('message')]

// Convert buffer data for debug log
const decodeBuffer = (type, data, enc) => 
  !Buffer.isBuffer(data) || !type ? data :
  type.includes('html') ? `[HTML: ${data.byteLength.toLocaleString()} bytes]` :
  type.includes('json') ? JSON.parse(data.toString(enc)) :
  /* other: */ data.toString(enc)


exports.httpHdr = ({ method, protocol, subdomains, hostname, originalUrl }, title = 'HTTP') => 
  `\x1b[35m${method} ${title.toUpperCase()}\x1b[0m ${protocol}://${subdomains.concat('').join('.')}${hostname}${originalUrl} `

exports.httpReq = (id, { headers, params, body, session, user, ips, ip, cookies, signedCookies }) => formatObject({
  id,
  headers,
  params,
  body: { ...body },
  cookies: (session ? [{ type: 'session', ...session.cookie }] : []).concat(cookies || []).concat(signedCookies || []),
  user,
  ips: ips.concat(ip)
})

exports.httpRes = (id, start, data, enc, headers, status) => formatObject({
  id,
  headers: { ...headers },
  timeMs: msAgo(start),
  status,
  data: decodeBuffer(headers['content-type'], data, enc),
})
