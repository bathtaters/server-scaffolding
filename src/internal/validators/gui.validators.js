const Users = require('../models/Users')
const { byModel, byObject } = require('./shared.validators')
const { swap, all } = require('./api.validators')
const { actions } = require('../../config/gui.cfg')

const formAdditional = [
  { key: '_pageData', typeStr: 'object?', isIn: 'body', limits: { max: 32 } },
]

const pageAdditional = [
  { key: 'page', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
  { key: 'size', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
]

const profileFields = { [Users.primaryId]: Users.primaryId, username: 'username', password: 'password', confirm: 'password' }

const actionOptions = ({ primaryId }, action, fields = 'all') => {
  switch(action) {
    case actions.find:   return [fields,      { additional: formAdditional, allowPartials: true }]
    case actions.create: return [fields,      { additional: formAdditional, optionalBody: false }]
    case actions.update: return [fields,      { additional: formAdditional }]
    case actions.delete: return [[primaryId], { additional: formAdditional }]
    case actions.clear:  return [[],          { additional: formAdditional }]
  }
  return []
}

module.exports = {
  all, swap,
  form:    (Model, action, formFields = 'all') => byModel(Model, ...actionOptions(Model, action, formFields)),
  profile: (action) => byModel(Users, ...actionOptions(Users, action, profileFields)),
  find:    (Model, formFields = 'all') => byModel(Model, formFields, { allowPartials: true, asQueryStr: true }),
  page:    byObject(pageAdditional),
  token:   byModel(Users, [Users.primaryId], { optionalBody: false }),
  formAdditional, pageAdditional,
}