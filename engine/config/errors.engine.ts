import createError from 'http-errors'

// Common HTTP codes --
//    400: no/invalid data from client
//    401: no/invalid credentials
//    403: no access for client
//    404: page doesn't exist
//    409: conflict with existing entry
//    429: too many requests (rate limit)
//    500: server error
//    502: database error

export const
// Basic Errors
unknown = () => createError(500, "Unknown server error.") ,
unknownDb = () => createError(502, "Unknwon database error."),
noDb = () => createError(502, "Unable to connect to database."),
shutdown = () => createError(503, "Server is currently shutting down.", { headers: { "retry-after": 3 * 60 } }),
missing = () => createError(404, "Resource not found."),
test = (msg = "API is not a Teapot.") => createError(418, msg),

// CRUD Errors
noID = () => createError(400, "No ID provided."),
noData = (missingField = 'data') => createError(400, `No ${missingField} provided.`),
noEntry = (id: string|number = '') => createError(400, `No entry exists at ID ${id}.`),
noSize = () => createError(400, "Invalid page size for paginated request."),
badData = (key = 'data', value: any, expected?: any) => createError(400, `${key} contains invalid value: ${value}${expected ? ` (should be ${expected})` : ''}.`),

// Authentication Errors
noUser = () => createError(401, "User not found."),
noToken = () => createError(401, "Missing bearer token or incorrect format."),
badToken = () => createError(401, "Invalid or outdated bearer token."),
noCSRF = () => createError(403, "Form expired or was tampered with (Missing or invalid CSRF token)."),
noSession = () => createError(403, "Error retrieving session (Check if cookies are being blocked)"),
noAccess = () => createError(403, "User does not have access."),
badAccess = (access: string, type = 'key') => createError(500, `Invalid access ${type}: ${access}.`),
noModel = (model = 'this model', access = '') => createError(403, `User does not have ${access} access to ${model}.`),
badModels = (models: any) => createError(500, `Invalid model list: [${typeof models}] ${JSON.stringify(models)}.`),
rateLimit = (data: any) => appendToError(createError(429, `Too many requests. Try again in a bit.`), { stack: JSON.stringify(data) }),

loginMessages = {
  noUser:     { fail: 'Incorrect username or user was deleted' },
  isLocked:   { fail: 'User is locked out due to too many failed attempts' },
  noPassword: { fail: 'Password not created (Contact administrator)' },
  noAccess:   { fail: 'Insufficient access level' },
  noMatch:    { fail: 'Incorrect password or misspelled username' },
},
usernameMessages = {
  missing: 'Must provide a username',
  illegal: 'Cannot contain spaces or symbols (Besides underscore & hyphen)',
  exists:  'Username already exists',
  duplicate: 'Duplicate username in user batch',
},

// Form Errors
noConfirm = () => createError(400, "Must confirm password"),
badConfirm = () => createError(400, "Passwords don't match"),
modifyOther = () => createError(403, "Must have admin privileges to modify other users"),
badAction = (action = '[None]') => createError(400, `Invalid action: ${action}.`),

// DB Errors
badKey = (key?: string, table = 'table') => createError(500, `Column "${key}" does not exist in ${table}.`),
noAdd = () => createError(502, "New entry was not created."),
noPrimary = (table?: string, method?: string) => createError(400, `PrimaryId for ${table}.${method} cannot be automatically determined. Must include in ${method} data.`),
sqlNotDB = () => new Error('Database file not recognized: confirm that DB_SECRET hasn\'t changed and check DB_PATH'),
sqlError = (err: any, sql: string, params: Record<string|number, any>) => appendToError(
  createError(502, err.message || err),
  { name: 'sqlError', stack: `\tCmd: ${sql}\n\t\t[${(Array.isArray(params) ? params : Object.values(params || {})).join(', ')}]` }
),
sqlInjection = (val: any, isReserved = false, table = '') => new Error(`${table ? `Column in ${table}` : 'Table name'} ${
  isReserved ? 'is a reserved keyword:' : typeof val === 'string' ? 
    'contains non-alphanumeric characters:' : `is not a string: <${typeof val}>`
  } ${val}`),


// Other Errors
badUsername = (username = 'for user', reason = 'Unknown error') => createError(409, `Cannot set name ${username}: ${reason}`),
deleteAdmin = () => createError(403, "Cannot remove the only admin. Add another admin then retry, or reset User Table to remove all users."),
noUndo = () => createError(500, "Undo queue is empty"),
missingCreds = (dev = false) => createError(500, `Unable to read SSL credentials, ${
  dev ? 'try running "npm run dev-cert"' : 'point meta.credPath to SSL/TLS credentials or disable useLocalCert'
}.`),
invalidPort = (address: any, port: number) => new Error(
  `Invalid port on listener: ${JSON.stringify(address)} (Requested port: ${port})`
)




// HELPER -- Add mesage and/or stack trace to HTTP Error

const appendToError = <N extends number = number, P extends Record<string,any> = {}>(
  error: createError.HttpError<N>,
  { message = '', stack = '', ...errorProps }: P & { message?: string, stack?: string }
) => ({
  ...error,
  ...errorProps,
  message: `${error.message || ''}${error.message ? ' ' : ''}${message}`,
  stack: `${error.stack || ''}${error.stack ? '\n' : ''}${stack}`,
})