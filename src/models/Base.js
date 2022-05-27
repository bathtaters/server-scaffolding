const Model = require('./AbstractModel')

class Base extends Model {
  constructor() {
    super('base', {
      data: 'TEXT',
    })
  }
}

module.exports = new Base()