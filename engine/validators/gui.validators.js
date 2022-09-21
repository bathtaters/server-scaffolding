const Users = require('../models/Users')
const { byModel, byObject } = require('./shared.validators')
const { swap, all } = require('./api.validators')
const { actions } = require(require('../src.path').config+'gui.cfg')

const formAdditional = [
  { key: '_action',     typeStr: 'string',   isIn: 'body', limits: { max: 16 } },
  { key: '_pageData',   typeStr: 'object?',  isIn: 'body', limits: { max: 32 } },
  { key: '_searchMode', typeStr: 'boolean?', isIn: 'body' },
]

const pageAdditional = {
  page: { typeStr: 'int?', limits: { min: 1 } },
  size: { typeStr: 'int?', limits: { min: 1 } },
}

const profileFields = { [Users.primaryId]: Users.primaryId, username: 'username', password: 'password', confirm: 'password' }

const actionOptions = ({ primaryId }, action, fields, findFields) => {
  switch(action) {
    case actions.find:   return [findFields||fields, { additional: formAdditional, allowPartials: true }]
    case actions.create: return [fields,             { additional: formAdditional, optionalBody: false }]
    case actions.update: return [fields,             { additional: formAdditional }]
    case actions.delete: return [[primaryId],        { additional: formAdditional }]
    case actions.clear:  return [[],                 { additional: formAdditional }]
  }
  return []
}

module.exports = {
  all, swap,
  form:    (Model, action, formFields = 'all', findFields = null) => byModel(Model, ...actionOptions(Model, action, formFields, findFields)),
  profile: (action) => byModel(Users, ...actionOptions(Users, action, profileFields)),
  find:    (Model, formFields = 'all') => byModel(Model, formFields, { allowPartials: true, asQueryStr: true }),
  page:    byObject(pageAdditional, ['query']),
  token:   byModel(Users, [Users.primaryId], { optionalBody: false }),
  formAdditional, pageAdditional,
}