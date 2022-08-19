const Users = require('../models/Users')
const definition = require('../config/users.cfg').definitions
const { formSettings } = require('../config/settings.cfg')
const { byObject } = require('./shared.validators')
const { page, find, form, formAdditional, token } = require('./gui.validators')
const { formSettingsToValidate } = require('../utils/validate.utils')
const { preValidateAdapter } = require('../services/users.services')

const preValidate = (asQueryStr = false, isSearch = false) => (req,res,next) => { preValidateAdapter(asQueryStr ? req.query : req.body, isSearch); next() }

let formFields = { confirm: 'password' }
Object.keys(definition).forEach((field) => { if (definition[field].html !== false) formFields[field] = field })

module.exports = {
  page, token,
  settings: byObject(formAdditional.concat(formSettingsToValidate(formSettings, 'body'))),
  find: [ preValidate(true, true)  ].concat(find(Users, formFields)),
  user: (action) => [ preValidate(false,false) ].concat(form(Users, action, formFields)),
}
