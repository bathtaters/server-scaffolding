const { parseISO, differenceInMilliseconds, format, isDate, formatISO } = require('date-fns')

const locale = require('date-fns/locale').enUS

module.exports = {
  parseISO, isDate,
  now: () => new Date().getTime(),
  msAgo: (date) => differenceInMilliseconds(module.exports.now(), date),
  formatLong:  (date) => date ? format(date, 'MM/dd/yy hh:mm:ssaaa', { locale }) : '-',
  formatShort: (date) => date ? format(date, 'MM/dd HH:mm', { locale }) : '',
  formatDateISO: (date) => date ? formatISO(date, { representation: 'date' }) : '',
}