import createError from 'http-errors'

// Passthrough engine errors
// export * as internalErrors from '../../engine/config/errors.engine'
export { badKey, noEntry } from '../../engine/config/errors.engine'


// Common HTTP codes --
//    400: no/invalid data from client
//    401: no/invalid credentials
//    403: no access for client
//    404: page doesn't exist
//    409: conflict with existing entry
//    500: server error
//    502: database error

// Add custom errors
export const error = () => createError(500, "Unknown server error.")