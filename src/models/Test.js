const Model = require('./_Model')

class Test extends Model {
  constructor() { super('test', { primaryId: 'testId' }) }
}

module.exports = new Test()