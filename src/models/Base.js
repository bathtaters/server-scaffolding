const Model = require('../internal/models/Model')

// new Model('base') // => Simple way to create a Model, add info to models.cfg

// Advanced model, allows overriding defaults & adding custom operations
class Base extends Model {
  constructor() { super('base') }
}

module.exports = new Base()