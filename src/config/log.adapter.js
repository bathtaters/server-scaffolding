module.exports = {
  debug: console.debug,
  info: console.info,
  log: console.log,
  warn: console.warn,
  error: console.error,
  middleware: require('morgan')(process.env.MORGAN_FMT || 'dev'),
}