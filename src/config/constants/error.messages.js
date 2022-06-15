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
  shutdown: () => createError(503, "Server is currently shutting down.", { headers: { "retry-after": 3 * 60 } }) ,
  missing: () => createError(404, "Resource not found."),
  test: () => createError(418, "API is not a Teapot."),

  // CRUD Errors
  noID: () => createError(400, "No ID provided."),
  noData: (missingField) => createError(400, `No ${missingField || 'data'} provided.`),
  noEntry: (id) => createError(400, `No entry exists at ID ${id || ''}.`),
  noAdd: () => createError(502, "New entry was not created."),
  
  // Authentication Errors
  noToken: () => createError(401, "Missing bearer token or incorrect format."),
  badToken: () => createError(401, "Invalid or outdated bearer token."),
  noAccess: () => createError(403, "User does not have access."),
  badAccess: (access, type = 'key') => createError(500, `Invalid access ${type}: ${access}.`),
  
  // Form Errors
  noConfirm: () => createError(400, "Must confirm password"),
  badConfirm: () => createError(400, "Passwords don't match"),
  modifyOther: () => createError(403, "Must have admin privlege to modify other users"),
  badAction: (action) => createError(400, `Invalid action: ${action || '[None]'}.`),

  // Other Errors
  badUsername: (username, reason) => createError(409, `Cannot add ${username || 'user'}: ${reason}`),
  internalValidate: (message) => createError(500, message),
}