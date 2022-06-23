const definition = require('../../config/models.cfg').types._users
const { byRoute, additionalOnly } = require('./shared.validators')
const { preValidateAdapter } = require('../services/users.services')
const { title, primaryId } = require('../models/Users')
const { maxCharCount } = require('../config/env.cfg')
const userValidation = byRoute(title)

const formValidate = [
  { key: 'action', typeStr: 'string', isIn: 'body', limits: { min: 1, max: 32 } },
  { key: 'queryString', typeStr: 'string*?', isIn: 'body', limits: { max: 32 } },
]

let formFields = { confirm: 'password' }
Object.keys(definition).forEach((field) => { formFields[field] = field })
delete formFields.username

module.exports = {
  token:   userValidation([], [primaryId]),
  env:     additionalOnly(formValidate.concat({ key: 'env', typeStr: 'string*?', isIn: 'body', limits: { max: maxCharCount } })),
  page:    additionalOnly([
    { key: 'page', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
    { key: 'size', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
  ]),
  form: [(req,res,next) => { preValidateAdapter(req.body); next() }].concat(
    userValidation([], formFields, true, formValidate)
  ),
}
