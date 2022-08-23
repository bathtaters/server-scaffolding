const createError = require('http-errors')
const appendToError = (error, { message, stack, ...errorProps }) => Object.assign(error, errorProps, {
  message: `${error.message || ''}${error.message ? ' ' : ''}${ message || ''}`,
  stack: `${error.stack || ''}${error.stack ? '\n' : ''}${ stack || ''}`,
})

// Common HTTP codes --
//    400: no/invalid data from client
//    401: no/invalid credentials
//    403: no access for client
//    404: page doesn't exist
//    409: conflict with existing entry
//    429: too many requests (rate limit)
//    500: server error
//    502: database error

module.exports = {
  // Basic Errors
  unknown: () => createError(500, "Unknown server error.") ,
  unknownDb: () => createError(502, "Unknwon database error."),
  noDb: () => createError(502, "Unable to connect to database."),
  shutdown: () => createError(503, "Server is currently shutting down.", { headers: { "retry-after": 3 * 60 } }),
  missing: () => createError(404, "Resource not found."),
  test: (msg) => createError(418, msg || "API is not a Teapot."),

  // CRUD Errors
  noID: () => createError(400, "No ID provided."),
  noData: (missingField) => createError(400, `No ${missingField || 'data'} provided.`),
  noEntry: (id) => createError(400, `No entry exists at ID ${id || ''}.`),
  noSize: () => createError(400, "Invalid page size for paginated request."),
  
  // Authentication Errors
  noUser: () => createError(401, "User not found."),
  noToken: () => createError(401, "Missing bearer token or incorrect format."),
  badToken: () => createError(401, "Invalid or outdated bearer token."),
  noCSRF: () => createError(403, "Form expired or was tampered with (Missing or invalid CSRF token)."),
  noAccess: () => createError(403, "User does not have access."),
  badAccess: (access, type = 'key') => createError(500, `Invalid access ${type}: ${access}.`),
  noModel: (model, access) => createError(403, `User does not have ${access || ''} access to ${model || 'this model'}.`),
  badModels: (models) => createError(500, `Invalid model list: [${typeof models}] ${JSON.stringify(models)}.`),
  rateLimit: (data) => appendToError(createError(429, `Too many requests. Try again in a bit.`), { stack: JSON.stringify(data) }),

  loginMessages: {
    noUser:     { fail: 'Incorrect username or user was deleted' },
    isLocked:   { fail: 'User is locked out due to too many failed attempts' },
    noPassword: { fail: 'Password not created (Contact administrator)' },
    noAccess:   { fail: 'Insufficient access level' },
    noMatch:    { fail: 'Incorrect password or misspelled username' },
  },
  usernameMessages: {
    missing: 'Must provide a username',
    illegal: 'Cannot contain spaces or symbols (Besides underscore & hyphen)',
    exists:  'Username already exists',
    duplicate: 'Duplicate username in user batch',
  },
  
  // Form Errors
  noConfirm: () => createError(400, "Must confirm password"),
  badConfirm: () => createError(400, "Passwords don't match"),
  modifyOther: () => createError(403, "Must have admin privileges to modify other users"),
  badAction: (action) => createError(400, `Invalid action: ${action || '[None]'}.`),

  // DB Errors
  badKey: (key, table = 'table') => createError(500, `Column "${key}" does not exist in ${table}.`),
  noAdd: () => createError(502, "New entry was not created."),
  sqlError: (err, sql, params) => appendToError(
    createError(502, err.message || err),
    { name: 'sqlError', stack: `\tCmd: ${sql}\n\t\t[${(Array.isArray(params) ? params : Object.values(params || {})).join(', ')}]` }
  ),
  sqlInjection: (val, isReserved, table) => new Error(`${table ? `Column in ${table}` : 'Table name'} ${
    isReserved ? 'is a reserved keyword:' : typeof val === 'string' ? 
      'contains non-alphanumeric characters:' : `is not a string: <${typeof val}>`
    } ${val}`),


  // Other Errors
  badUsername: (username, reason) => createError(409, `Cannot set name ${username || 'for user'}: ${reason}`),
  deleteAdmin: () => createError(403, "Cannot remove the only admin. Add another admin then retry, or reset User Table to remove all users."),
  noUndo: () => createError(500, "Undo queue is empty"),
  missingCreds: (dev) => createError(500, `Unable to read SSL credentials, ${
    dev ? 'try running "npm run dev-cert"' : 'point meta.credPath to SSL/TLS credentials or disable useLocalCert'
  }.`)
}