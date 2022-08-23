const { byModel } = require('./shared.validators')

module.exports = {
  all:    (Model) => byModel(Model, 'all', { optionalBody: false }),
  idAll:  (Model) => byModel(Model, 'all', { params: [Model.primaryId] }),
  idOnly: (Model) => byModel(Model, [],    { params: [Model.primaryId] }),
  swap:   (Model) => byModel(Model, { [Model.primaryId]: Model.primaryId, swap: Model.primaryId }, { optionalBody: false }),
}
