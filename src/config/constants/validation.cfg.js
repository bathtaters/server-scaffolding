// Validation Config Vars
const userCfg = require('./users.cfg')

module.exports = {
  // Default values
  defaults: {
    _users: {
      username: "user",
      access: userCfg.defaultAccess,
      cors: '*',
    },
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
    _users: {
      id: { min: 32, max: 32 },
      token: { min: 32, max: 32 },
      access: { elem: { max: 16 }, array: { max: Object.keys(userCfg.access).length } },
      cors: { min: 0, max: 2048 },
      ...userCfg.limits
    },
    base: {
      data: { min: 0, max: 1000 },
    },
    test: {
      name: { min: 0, max: 100 },
      number: { min: -999, max: 999 },
      comment: { min: 0, max: 1000 },
    },
  },

  // Data types
  //  Values: string|uuid|b64(url)|hex|date|datetime|boolean|int|float|object|any
  //  Suffix: [] = array of, ? = optional
  //  string* = allow symbols/spaces
  types: {
    _users: {
      id: "hex",
      username: "string",
      password: "string",
      token: "hex",
      access: "string[]?",
      cors: "string*",
    },
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
  }
}