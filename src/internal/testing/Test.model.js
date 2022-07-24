const Model = require('../models/Model')

module.exports = new Model('test', {
  primaryId: 'testId',

  types: {
    testId: "int",
    name: "string",
    number: "float",
    comment: "string*?",
    isOn: "boolean",
  },

  defaults: {
    name: "None",
    number: -1,
    isOn: true,
  },

  limits: {
    name: { min: 2, max: 100 },
    number: { min: -999, max: 999 },
    comment: { min: 0, max: 1000 },
  },
})