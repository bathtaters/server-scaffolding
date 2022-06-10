const Model = require('./_Model')

class Test extends Model {
  constructor() {
    super('test', {
      name: 'TEXT',
      number: 'REAL',
      comment: 'TEXT',
    })
  }
}

module.exports = new Test()