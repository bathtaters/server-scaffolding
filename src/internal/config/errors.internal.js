const createError = require('http-errors')

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
  shutdown: () => createError(503, "Server is currently shutting down.", { headers: { "retry-after": 3 * 60 } }) ,
  missing: () => createError(404, "Resource not found."),
  test: () => createError(418, "API is not a Teapot."),

  // CRUD Errors
  noID: () => createError(400, "No ID provided."),
  noData: (missingField) => createError(400, `No ${missingField || 'data'} provided.`),
  noEntry: (id) => createError(400, `No entry exists at ID ${id || ''}.`),
  noAdd: () => createError(502, "New entry was not created."),
  noSize: () => createError(400, "Invalid page size for paginated request."),
  badPartial: (type) => createError(500, `Attempting partial match with ${type || 'invalid type'}, must be string or bitmap.`),
  
  // Authentication Errors
  noUser: () => createError(401, "User not found."),
  noToken: () => createError(401, "Missing bearer token or incorrect format."),
  badToken: () => createError(401, "Invalid or outdated bearer token."),
  noAccess: () => createError(403, "User does not have access."),
  badAccess: (access, type = 'key') => createError(500, `Invalid access ${type}: ${access}.`),
  noModel: (model, access) => createError(403, `User does not have ${access || ''} access to ${model || 'this model'}.`),
  badModels: (models) => createError(500, `Invalid model list: [${typeof models}] ${JSON.stringify(models)}.`),
  loginMessages: {
    noUser:     { fail: 'Incorrect username or user was deleted' },
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
  badUsername: (username, reason) => createError(409, `Cannot add ${username || 'user'}: ${reason}`),
  deleteAdmin: () => createError(403, "Cannot remove the only admin. Add a new admin then retry, or reset User Table to remove all users."),
  noUndo: () => createError(500, "Undo queue is empty"),
}