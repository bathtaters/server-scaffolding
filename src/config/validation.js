// Validation Config Vars
module.exports = {
  // Default values
  defaults: {
    base: {
      id: 0,
      data: "DEFAULT VALUE",
    },
  },

  // Num/Char limits
  limits: {
    base: {
      data: { min: 0, max: 1000 },
    },
  },

  // Data types
  types: {
    base: {
      id: "int?",
      data: "string*",
      // Values: string|uuid|date|datetime|boolean|int|object|any
      // Suffix: [] = array of, ? = optional
      // string* = allow symbols/spaces
    },
  }
}