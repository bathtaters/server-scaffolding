// Validation Config Vars
module.exports = {
  // Default values
  defaults: {
    base: {
      param: "DEFAULT VALUE",
    },
  },

  // Num/Char limits
  limits: {
    base: {
      param: { min: 0, max: 1000 },
    },
  },

  // Data types
  types: {
    base: {
      param: "string"
      // Values: string|uuid|date|datetime|boolean|int|object|any
      // Suffix: [] = array of, ? = optional
      // string* = allow symbols/spaces
    },
  }
}