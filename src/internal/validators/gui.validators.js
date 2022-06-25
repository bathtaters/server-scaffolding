const { byRoute, additionalOnly } = require('./shared.validators')
const { swap, all } = require('./api.validators')

const formAdditional = [
  { key: 'action', typeStr: 'string', isIn: 'body', limits: { min: 1, max: 32 } },
  { key: 'queryString', typeStr: 'string*?', isIn: 'body', limits: { max: 32 } },
]

const pageAdditional = [
  { key: 'page', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
  { key: 'size', typeStr: 'int?', isIn: 'query', limits: { min: 1 } },
]

module.exports = {
  all, swap,
  page: additionalOnly(pageAdditional),
  find: (Model, formFields = 'all') => byRoute(Model.title)([], formFields, true, true,  true),
  form: (Model, formFields = 'all') => byRoute(Model.title)([], formFields, true, false, false, formAdditional),
  formNoMin: (Model, formFields = 'all') => byRoute(Model.title)([], formFields, true, false, true, formAdditional),
  formAdditional, pageAdditional,
}