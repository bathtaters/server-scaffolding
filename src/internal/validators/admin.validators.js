const Users = require('../models/Users')
const definition = require('../../config/models.cfg').types._users
const { formSettings } = require('../config/settings.cfg')
const { byRoute, additionalOnly } = require('./shared.validators')
const { page, find, form, formNoMin, formAdditional } = require('./gui.validators')
const { formSettingsToValidate } = require('../utils/validate.utils')
const { preValidateAdapter } = require('../services/users.services')

const preValidate = (bodyIsQuery = false, isSearch = false) => (req,res,next) => { preValidateAdapter(bodyIsQuery ? req.query : req.body, isSearch); next() }

let formFields = { confirm: 'password' }
Object.keys(definition).forEach((field) => { formFields[field] = field })

module.exports = {
  page,
  token: byRoute(Users.title)([], [Users.primaryId]),
  settings: additionalOnly(formAdditional.concat(formSettingsToValidate(formSettings, 'body'))),
  find: [ preValidate(true, true)  ].concat(find(Users, formFields)),
  form: [ preValidate(false,false) ].concat(form(Users, formFields)),
  formNoMin: [ preValidate(false,true) ].concat(formNoMin(Users, formFields)),
}
