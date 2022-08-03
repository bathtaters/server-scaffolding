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
    objectList: "object[]?",
  },

  defaults: {
    number: -1,
    isOn: true,
    testDate: "2000-01-02T00:00",
  },

  limits: {
    testId: { min: 0, max: 9999 },
    name: { min: 2, max: 100 },
    number: { min: -999, max: 999 },
    comment: { min: 0, max: 1000 },
    objectList: { array: { max: 20 } },
  },
})