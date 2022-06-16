const validate = require('./shared.validators')
const { title } = require('../models/Users')

module.exports = {
  login:   validate.byRoute(title)([], [ 'username', 'password' ]),
}
