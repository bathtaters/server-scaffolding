// Validation Config Vars
module.exports = {
  // Default values
  defaults: {
    base: {
      id: 0,
      data: "DEFAULT VALUE",
    },
    test: {
      id: 0,
      name: "None",
      number: -1,
      comment: "",
    },
    _users: {
      username: "New User",
      access: 0,
    },
  },

  // Num/Char limits
  limits: {
    base: {
      data: { min: 0, max: 1000 },
    },
    test: {
      name: { min: 0, max: 100 },
      number: { min: -999, max: 999 },
      comment: { min: 0, max: 1000 },
    },
    _users: {
      username: { min: 2, max: 255 },
      password: { min: 8, max: 128 },
      key: { min: 0, max: 88 },
      salt: { min: 44, max: 44 },
      token: { min: 32, max: 32 },
      access: { min: 0, max: require('./users.cfg').accessMax },
    },
  },

  // Data types
  //  Values: string|uuid|b64|date|datetime|boolean|int|float|object|any
  //  Suffix: [] = array of, ? = optional
  //  string* = allow symbols/spaces
  types: {
    base: {
      id: "int",
      data: "string*",
    },
    test: {
      id: "int",
      name: "string",
      number: "float",
      comment: "string*?",
    },
    _users: {
      id: "b64",
      username: "string",
      password: "string?",
      access: "int",
      key: "b64?",
      salt: "b64?",
      urls: "string*[]?",
    },
  }
}