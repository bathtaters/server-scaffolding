const validate = require('./shared.validators')

module.exports = {
  all:    ({ title            }) => validate.byRoute(title)([         ], 'all', true),
  idAll:  ({ title, primaryId }) => validate.byRoute(title)([primaryId], 'all', true),
  idOnly: ({ title, primaryId }) => validate.byRoute(title)([primaryId], []),
  swap:   ({ title, primaryId }) => validate.byRoute(title)([], { [primaryId]: primaryId, swap: primaryId }),
}
