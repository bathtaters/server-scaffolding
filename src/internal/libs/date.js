const { parseISO, differenceInMilliseconds, format, isDate } = require('date-fns')

const locale = 'en-US'

module.exports = {
  parseISO, isDate,
  now: () => new Date().getTime(),
  msAgo: (date) => differenceInMilliseconds(module.exports.now(), date),
  formatLong:  (date) => date ? format(date, 'MM/dd/yy hh:mm:ssaaa', { locale }) : '-',
  formatShort: (date) => date ? format(date, 'MM/dd HH:mm', { locale }) : '',
}