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
//    500: server error
//    502: database error

module.exports = {
  // Basic Errors
  unknown: () => createError(500, "Unknown server error.") ,
  unknownDb: () => createError(502, "Unknwon database error."),
  noDb: () => createError(502, "Unable to connect to database."),
  shutdown: () => createError(503, "Server is currently shutting down.", { headers: { "retry-after": 3 * 60 } }) ,
  missing: () => createError(404, "Resource not found."),
  test: (msg) => createError(418, msg || "API is not a Teapot."),

  // CRUD Errors
  noID: () => createError(400, "No ID provided."),
  noData: (missingField) => createError(400, `No ${missingField || 'data'} provided.`),
  noEntry: (id) => createError(400, `No entry exists at ID ${id || ''}.`),
  noAdd: () => createError(502, "New entry was not created."),
  noSize: () => createError(400, "Invalid page size for paginated request."),
  badPartial: (type) => createError(500, `Attempting partial match with ${type || 'invalid type'}, must be string, boolean or bitmap.`),
  
  // Authentication Errors
  noUser: () => createError(401, "User not found."),
  noToken: () => createError(401, "Missing bearer token or incorrect format."),
  badToken: () => createError(401, "Invalid or outdated bearer token."),
  noCSRF: () => createError(403, "Missing or invalid CSRF token."),
  noAccess: () => createError(403, "User does not have access."),
  badAccess: (access, type = 'key') => createError(500, `Invalid access ${type}: ${access}.`),
  noModel: (model, access) => createError(403, `User does not have ${access || ''} access to ${model || 'this model'}.`),
  badModels: (models) => createError(500, `Invalid model list: [${typeof models}] ${JSON.stringify(models)}.`),
  loginMessages: {
    noUser:     { fail: 'Incorrect username or user was deleted' },
    isLocked:   { fail: 'User is locked out due to too many failed attempts' },
    noPassword: { fail: 'Password not created (Contact administrator)' },
    noAccess:   { fail: 'Insufficient access level' },
    noMatch:    { fail: 'Incorrect password or misspelled username' },
  },
  
  // Form Errors
  noConfirm: () => createError(400, "Must confirm password"),
  badConfirm: () => createError(400, "Passwords don't match"),
  modifyOther: () => createError(403, "Must have admin privlege to modify other users"),
  badAction: (action) => createError(400, `Invalid action: ${action || '[None]'}.`),

  // Other Errors
  sqlError: (err, sql, params) => appendToError(createError(502, err.message || err), { name: 'sqlError', stack: `\tCmd: ${sql}\n\t\t[${(params || []).join(', ')}]` }),
  badUsername: (username, reason) => createError(409, `Cannot set name ${username || 'for user'}: ${reason}`),
  deleteAdmin: () => createError(403, "Cannot remove the only admin. Add another admin then retry, or reset User Table to remove all users."),
  noUndo: () => createError(500, "Undo queue is empty"),
  sqlInjection: (val, table) => new Error(`${table ? `Column in ${table}` : 'Table name'} ${
    typeof val === 'string' ? 'contains non-alphanumeric characters:' : `is not a string: <${typeof val}>`
  } ${val}`
  ),
}