const Model = require('../../engine/models/Model')

/* --- Simple Model --- */
module.exports = new Model('base', {
  // Layout of Database object
  id: {
    // .id is automatically added as int primary key
    typeStr: "int",
    isPrimary: true,
  },
  data: {
    //  Values: string|uuid|b64(url)|hex|date|datetime|boolean|int|float|object|any
    //  Suffix: [] = array of, ? = optional
    //  string* = allow symbols/spaces
    typeStr: "string*",

    // Standard Num/Char limits
    limits: { min: 0, max: 1000 },
    // Array size / Element num/char limits = { array: { min: 1, max: 10 }, elem: { min: 4, max: 100 } },

    // Default value (used when adding entry if no value provided)
    default: "DEFAULT VALUE",
  },
})


/* --- Advanced Model --- *\
class Base extends Model {
  constructor() {
    super('base', {
      data: {
        typeStr: "string*",
        limits: { min: 0, max: 1000 },
        default: "DEFAULT VALUE",
      },
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