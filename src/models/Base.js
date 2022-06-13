const Model = require('./_Model')

class Base extends Model {
  constructor() { super('base') }
}

module.exports = new Base()