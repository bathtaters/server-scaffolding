const validate = require('./shared.validators')
const { title } = require('../models/_Users')

module.exports = {
  login:   validate.byRoute(title)([], [ 'username', 'password' ]),
}
