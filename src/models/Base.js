const Model = require('../internal/models/Model')

/* --- Simple Model --- */
module.exports = new Model('base', {
  types: {
    id: "int",
    data: "string*",
    //  Values: string|uuid|b64(url)|hex|date|datetime|boolean|int|float|object|any
    //  Suffix: [] = array of, ? = optional
    //  string* = allow symbols/spaces
  },

  limits: {
    // Array size / Element num/char limits
    array: { array: { min: 1, max: 10 }, elem: { min: 4, max: 100 } },
    // Num/Char limits
    data: { min: 0, max: 1000 },
  },

  defaults: {
    data: "DEFAULT VALUE",
  },
})


/* --- Advanced Model --- *\
class Base extends Model {
  constructor() {
    super('base', {
      types: { id: "int", data: "string*" },
      limits: { data: { min: 0, max: 1000 } },
      defaults: { data: "DEFAULT VALUE" },
    })

    // Additional initialization
    this.newProp = 'NEW'
  }

  get(...args) {
    // Override built-in method
    return super.get(...args)
  }

  helper() {
    // Add new method
    return null
  }
}

module.exports = new Base()
//*/