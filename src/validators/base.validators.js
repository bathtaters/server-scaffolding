const validate = require('./shared.validators').byRoute('base')

module.exports = {
  sample: validate([], 'all', true),
}
