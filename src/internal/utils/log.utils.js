// Get highest value log from Levels array ({ levelName: levelValue, ... })
exports.getMaxEntry = (obj) => Object.entries(obj).reduce((max, [key, val]) => val > max[1] ? [key, val] : max, [null, Number.NEGATIVE_INFINITY])

// Normalize log level
exports.getLogLevel = (logLevel, { levels, defaultLevel, testLevel, silent, httpDebug }, key) => {
  if (process.env.NODE_ENV === 'test' && testLevel) return key === 'console' ? { level: testLevel } : { silent: true }

  if (!logLevel && key) logLevel = defaultLevel[key]

  if (typeof logLevel === 'string') logLevel = logLevel.toLowerCase()

  if (logLevel in levels) return { level: logLevel }
  if (silent.includes(logLevel)) return { silent: true }
  if (httpDebug.includes(logLevel)) return { level: exports.getMaxEntry(levels)[0] || 'verbose' }

  if (!key) throw new Error(`Invalid default log level: ${logLevel}`)
  return exports.getLogLevel(defaultLevel[key], { levels, defaultLevel, silent, httpDebug })
}

// Convert buffer data for debug log
const decodeBuffer = (type, data, enc) => 
  !Buffer.isBuffer(data) || !type ? data :
  type.includes('html') ? `[HTML: ${data.byteLength.toLocaleString()} bytes]` :
  type.includes('json') ? JSON.parse(data.toString(enc)) :
  /* other: */ data.toString(enc)

// Format HTTP messages
exports.httpHdr = ({ method, protocol, subdomains, hostname, originalUrl }, title = 'HTTP') => 
  `\n\x1b[35m${title.toUpperCase()}\x1b[0m: ${method} ${protocol}://${subdomains.concat('').join('.')}${hostname}${originalUrl}`

exports.httpReq = (id, { headers, params, body, session, user, ips, ip, cookies, signedCookies }) => ({
  id,
  headers,
  params,
  body: { ...body },
  cookies: session && session.cookie,
  // cookies: (session ? [{ type: 'session', ...session.cookie }] : []).concat(cookies || []).concat(signedCookies || []),
  user,
  ips: ips.concat(ip)
})

exports.httpRes = (id, start, data, enc, headers, status) => ({
  id,
  headers: { ...headers },
  timeMs: new Date().getTime() - start,
  status,
  data: decodeBuffer(headers['content-type'], data, enc),
})
