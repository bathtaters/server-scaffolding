const Users = require('../models/Users')
const { byModel, byObject } = require('./shared.validators')
const { swap, all } = require('./api.validators')

const formAdditional = [
  { key: 'action', typeStr: 'string', isIn: 'body', limits: { min: 1, max: 32 } },
  { key: 'pageData', typeStr: 'object?', isIn: 'body', limits: { max: 32 } },
]

const pageAdditional = [
  { key: 'page', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
  { key: 'size', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
]

const profileFields = { username: 'username', password: 'password', confirm: 'password' }

module.exports = {
  all, swap,
  page: byObject(pageAdditional),
  find:      (Model, formFields = 'all') => byModel(Model, formFields, { allowPartials: true, asQueryStr: true }),
  form:      (Model, formFields = 'all') => byModel(Model, formFields, { additional: formAdditional }),
  formNoMin: (Model, formFields = 'all') => byModel(Model, formFields, { additional: formAdditional, allowPartials: true }),
  profile: byModel(Users, profileFields, { additional: formAdditional }),
  token:   byModel(Users, [Users.primaryId]),
  formAdditional, pageAdditional,
}