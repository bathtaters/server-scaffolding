// Validation Config Vars
const userDefinitions = require('../internal/config/users.cfg').definitions
const testDefinitions = require('../internal/testing/test.cfg').modelDefinitions

module.exports = {
  // Data types
  types: {
    _users: userDefinitions.types,
    test: testDefinitions.types,
    
    base: {
      id: "int",
      data: "string*",
    },
    //  Values: string|uuid|b64(url)|hex|date|datetime|boolean|int|float|object|any
    //  Suffix: [] = array of, ? = optional
    //  string* = allow symbols/spaces
  },

  // Default values
  defaults: {
    _users: userDefinitions.defaults,
    test: testDefinitions.defaults,

    base: {
      data: "DEFAULT VALUE",
    },
  },

  // Num/Char limits
  limits: {
    _users: userDefinitions.limits,
    test: testDefinitions.limits,
    
    base: {
      data: { min: 0, max: 1000 },
    },
  },
}