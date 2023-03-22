import createError from 'http-errors'

// Import engine errors
import { badKey, noEntry } from '../../engine/config/errors.engine'
import internalErrors from '../../engine/config/errors.engine' // To use when engine is TypeScript
export default { 
    ...internalErrors,
    badKey, noEntry,
    error: () => createError(500, "Unknown server error.")
}


// **** Substitute below once engine is TypeScript **** //

// import createError from 'http-errors'

// // Import engine errors
// export { badKey, noEntry } from '../../engine/config/errors.engine'
// export * from '../../engine/config/errors.engine'


// // Common HTTP codes --
// //    400: no/invalid data from client
// //    401: no/invalid credentials
// //    403: no access for client
// //    404: page doesn't exist
// //    409: conflict with existing entry
// //    500: server error
// //    502: database error

// // Add custom errors
// export const error = () => createError(500, "Unknown server error.")