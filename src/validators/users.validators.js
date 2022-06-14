const definition = require('../config/constants/validation.cfg').types._users
const validate = require('./shared.validators')
const { preValidateAdapter } = require('../services/users.services')
const idKey = require('../models/_Users').primaryId
const model = "_users"

let formFields = { confirm: 'password' }
Object.keys(definition).forEach((field) => { formFields[field] = field })
delete formFields.username
module.exports = {
  regen:   validate.byRoute(model)([], [idKey]),
  login:   validate.byRoute(model)([], [ 'username', 'password' ]),
  form:    [
    (req,_,next) => { preValidateAdapter(req.body); next() },
    ...validate.byRoute(model)([], formFields, true),
  ]
}
