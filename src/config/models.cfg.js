// Validation Config Vars
const userDefinitions = require('../internal/config/users.cfg').definitions

module.exports = {
  // Data types
  //  Values: string|uuid|b64(url)|hex|date|datetime|boolean|int|float|object|any
  //  Suffix: [] = array of, ? = optional
  //  string* = allow symbols/spaces
  types: {
    _users: userDefinitions.types,

    base: {
      id: "int",
      data: "string*",
    },
    test: {
      testId: "int",
      name: "string",
      number: "float",
      comment: "string*?",
    },
  },

  // Default values
  defaults: {
    _users: userDefinitions.defaults,

    base: {
      data: "DEFAULT VALUE",
    },
    test: {
      name: "None",
      number: -1,
    },
  },

  // Num/Char limits
  limits: {
    _users: userDefinitions.limits,
    
    base: {
      data: { min: 0, max: 1000 },
    },
    test: {
      name: { min: 2, max: 100 },
      number: { min: -999, max: 999 },
      comment: { min: 0, max: 1000 },
    },
  },
}