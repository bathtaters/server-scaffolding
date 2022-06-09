// Validation Config Vars
module.exports = {
  // Default values
  defaults: {
    _users: {
      username: "user",
      access: require('./users.cfg').defaultAccess,
      urls: '*',
    },
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
  },

  // Num/Char limits
  limits: {
    _users: {
      id: { min: 32, max: 32 },
      username: { min: 2, max: 255 },
      password: { min: 8, max: 128 },
      token: { min: 32, max: 32 },
      access: { elem: { max: 5 }, array: { max: Object.keys(require('./users.cfg').access).length } },
      urls: { min: 0, max: 2048 },
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
      urls: "string*",
    },
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
  }
}