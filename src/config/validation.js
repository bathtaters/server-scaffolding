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
  },

  // Data types
  //  Values: string|uuid|date|datetime|boolean|int|float|object|any
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
  }
}