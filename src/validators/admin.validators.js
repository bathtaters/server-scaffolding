const definition = require('../config/constants/validation.cfg').types._users
const validate = require('./shared.validators')
const { preValidateAdapter } = require('../services/users.services')
const { title, primaryId } = require('../models/_Users')

let formFields = { confirm: 'password' }
Object.keys(definition).forEach((field) => { formFields[field] = field })
delete formFields.username

module.exports = {
  token:   validate.byRoute(title)([], [primaryId]),
  form:
    [(req,res,next) => { preValidateAdapter(req.body); next() }]
      .concat(validate.byRoute(title)([], formFields, true)),
}