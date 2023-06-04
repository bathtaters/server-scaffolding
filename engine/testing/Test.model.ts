import Model from '../models/Model'

export default new Model('test', {
  testId: {
    isPrimary: true,
    limits: { min: 0, max: 1000 },
  },
  name: {
    type: "string",
    limits: { min: 2, max: 100 },
  },
  number: {
    type: "float",
    default: -1,
    limits: { min: -999, max: 999 },
  },
  comment: {
    type: "html?",
    limits: { min: 0, max: 1000 },
  },
  isOn: {
    type: "boolean",
    default: true,
  },
  testDate: {
    type: "datetime?",
    default: new Date("2000-01-02T00:00"),
  },
  numbers: {
    type: "int[]",
    limits: { array: { min: 0, max: 20 }, elem: { min: -10, max: 10 } },
  },
  objectList: {
    type: "object[]",
    limits: { array: { max: 20 } },
  },
})