const definition = require('../../config/models.cfg').types._users
const { byRoute, additionalOnly } = require('./shared.validators')
const { preValidateAdapter } = require('../services/users.services')
const { title, primaryId } = require('../models/Users')
const userValidation = byRoute(title)

let formFields = { confirm: 'password' }
Object.keys(definition).forEach((field) => { formFields[field] = field })
delete formFields.username

module.exports = {
  token:   userValidation([], [primaryId]),
  page:    additionalOnly([
    { key: 'page', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
    { key: 'size', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
  ]),
  form: [(req,res,next) => { preValidateAdapter(req.body); next() }].concat(
    userValidation([], formFields, true, [{ key: 'queryString', typeStr: 'string*?', isIn: 'body', limits: { min: 0, max: 32 } }])
  ),
}
