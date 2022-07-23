module.exports = {
  // Port to use for tests (0 will use random port for each instance)
  port: 0,
  // DB Source for tests (':memory:' will create temporary in-memory DB)
  testDb: ':memory:',
  // Force log level when testing & disable files, falsy value will use .env level
  testLog: 'none',

  modelDefinitions: {
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
  }
}