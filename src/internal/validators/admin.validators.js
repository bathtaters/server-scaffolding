const Users = require('../models/Users')
const definition = require('../../config/models.cfg').types._users
const { byRoute, additionalOnly } = require('./shared.validators')
const { page, find, form, formNoMin, formAdditional } = require('./gui.validators')
const { preValidateAdapter } = require('../services/users.services')
const { maxCharCount } = require('../config/env.cfg')

const preValidate = (bodyIsQuery = false) => (req,res,next) => { preValidateAdapter(bodyIsQuery ? req.query : req.body); next() }

let formFields = { confirm: 'password' }
Object.keys(definition).forEach((field) => { formFields[field] = field })

module.exports = {
  page,
  token: byRoute(Users.title)([], [Users.primaryId]),
  env:   additionalOnly(formAdditional.concat({ key: 'env', typeStr: 'string*?', isIn: 'body', limits: { max: maxCharCount } })),
  find: [ preValidate(true)  ].concat(find(Users, formFields)),
  form: [ preValidate(false) ].concat(form(Users, formFields)),
  formNoMin: [ preValidate(false) ].concat(formNoMin(Users, formFields)),
}
