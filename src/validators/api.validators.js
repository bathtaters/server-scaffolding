const validate = require('./shared.validators')

module.exports = {
  all: (model) => validate.byRoute(model)([], 'all', true),
}
