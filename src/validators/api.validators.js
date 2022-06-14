const validate = require('./shared.validators')

module.exports = {
  all:    (model) => validate.byRoute(model)([], 'all', true),
  idAll:  (model, idKey) => validate.byRoute(model)([idKey], 'all', true),
  idOnly: (model, idKey) => validate.byRoute(model)([idKey], []),
  swap:   (model, idKey) => validate.byRoute(model)([], { [idKey]: idKey, swap: idKey }),
}
