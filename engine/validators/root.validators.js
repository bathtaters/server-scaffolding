const { byModel } = require('./shared.validators')
const Users = require('../models/Users')

module.exports = {
  login:   byModel(Users, [ 'username', 'password' ], { optionalBody: false }),
}
