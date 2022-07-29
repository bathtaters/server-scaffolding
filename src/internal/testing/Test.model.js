const Model = require('../models/Model')

module.exports = new Model('test', {
  primaryId: 'testId',

  types: {
    testId: "int",
    name: "string",
    number: "float",
    comment: "string*?",
    isOn: "boolean",
    testDate: "datetime?",
  },

  defaults: {
    name: "None",
    number: -1,
    isOn: true,
    testDate: "2000-01-01T00:00",
  },

  limits: {
    name: { min: 2, max: 100 },
    number: { min: -999, max: 999 },
    comment: { min: 0, max: 1000 },
  },
})