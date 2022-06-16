const Model = require('../internal/models/Model')

class Test extends Model {
  constructor() { super('test', { primaryId: 'testId' }) }
}

module.exports = new Test()