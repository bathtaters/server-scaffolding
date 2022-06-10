const cors = require('cors')
const Users = require('../models/_Users')
const { hasAccess } = require('../utils/users.utils')
const { deepUnescape } = require('../utils/validate.utils')
const { apiToken } = require('../config/constants/users.cfg')

const getToken = (authHdr) => authHdr && (authHdr.match(apiToken.matchToken) || [])[1]

async function getCors(req, callback) {
  const authToken = getToken(req.get(apiToken.header))
  if (!authToken) return callback(new Error("No bearer token or token is incorrect format."))
  
  const user = await Users.get(authToken,'token')
  if (!user || !('cors' in user) || !('access' in user))
    return callback(new Error("Invalid token or user no longer exists."))

  if (!hasAccess(user.access, 'api')) return callback(new Error("User does not have access to API."))

  return callback(null, {
    credentials: true,
    methods: ['GET','POST','PUT','DELETE'],
    origin: deepUnescape(user.cors),
  })
}

module.exports = cors(getCors)