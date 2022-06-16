const Model = require('../internal/models/Model')

class Base extends Model {
  constructor() { super('base') }
}

module.exports = new Base()