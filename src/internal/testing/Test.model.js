const Model = require('../models/Model')
const { modelDefinitions } = require('./test.cfg')

class Test extends Model {
  constructor() { super('test', { primaryId: 'testId', ...modelDefinitions }) }
}

module.exports = new Test()