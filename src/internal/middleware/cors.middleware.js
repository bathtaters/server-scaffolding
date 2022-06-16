const cors = require('cors')
const Users = require('../models/Users')
const { hasAccess } = require('../utils/users.utils')
const { deepUnescape } = require('../utils/validate.utils')
const { apiToken, access } = require('../config/users.cfg')
const errors = require('../../config/error.messages')

const getToken = (authHdr) => authHdr && (authHdr.match(apiToken.matchToken) || [])[1]

async function getCors(req, callback) {
  const authToken = getToken(req.get(apiToken.header))
  if (!authToken) return callback(errors.noToken())
  
  const user = await Users.get(authToken,'token')
  if (!user || !('cors' in user) || !('access' in user))
    return callback(errors.badToken())

  if (!hasAccess(user.access, access.api)) return callback(errors.noAccess())

  Users.get(user.id, null, 'api')
  return callback(null, {
    credentials: true,
    methods: ['GET','POST','PUT','DELETE'],
    origin: deepUnescape(user.cors),
  })
}

module.exports = cors(getCors)