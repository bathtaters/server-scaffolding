const Model = require('./_Model')

class Base extends Model {
  constructor() {
    super('base', {
      data: 'TEXT',
    })
  }
}

module.exports = new Base()