import { parseISO, differenceInMilliseconds, format, isDate, formatISO } from 'date-fns'

const locale = require('date-fns/locale').enUS

export { parseISO, isDate }

export const
  now = Date.now,
  msAgo = (date: number | Date) => differenceInMilliseconds(module.exports.now(), date),
  formatLong =  (date?: number | Date) => date ? format(date, 'MM/dd/yy hh:mm:ssaaa', { locale }) : '-',
  formatShort = (date?: number | Date) => date ? format(date, 'MM/dd HH:mm', { locale }) : '',
  formatDateISO = (date?: number | Date) => date ? formatISO(date, { representation: 'date' }) : ''