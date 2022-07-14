module.exports = {
  // Port to use for tests (0 will use random port for each instance)
  port: 0,
  // DB Source for tests (':memory:' will create temporary in-memory DB)
  testDb: ':memory:',
  // Force log level when testing & disable files, falsy value will use .env level
  testLog: 'none',
}