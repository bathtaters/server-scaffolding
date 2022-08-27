const Model = require('../models/Model.engine')

module.exports = new Model('test', {
  testId: {
    isPrimary: true,
    limits: { min: 0, max: 1000 },
  },
  name: {
    typeStr: "string",
    limits: { min: 2, max: 100 },
  },
  number: {
    typeStr: "float",
    default: -1,
    limits: { min: -999, max: 999 },
  },
  comment: {
    typeStr: "string*?",
    limits: { min: 0, max: 1000 },
  },
  isOn: {
    typeStr: "boolean",
    default: true,
  },
  testDate: {
    typeStr: "datetime?",
    default: "2000-01-02T00:00",
  },
  objectList: {
    typeStr: "object[]?",
    limits: { array: { max: 20 } },
  },
})