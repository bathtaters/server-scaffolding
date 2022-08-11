const csrf = require('csurf')
const { csrfEnable } = require('../config/server.cfg')

module.exports = csrfEnable && csrf()