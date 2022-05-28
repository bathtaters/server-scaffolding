const validate = require('./shared.validators')

module.exports = {
  all:    (model) => validate.byRoute(model)([    ], 'all', true),
  idAll:  (model) => validate.byRoute(model)(['id'], 'all', true),
  idOnly: (model) => validate.byRoute(model)(['id'], []),
  swap:   (model) => validate.byRoute(model)([    ], { id: 'id', swap: 'id' }),
}
