import { parseISO, differenceInMilliseconds, format, isDate as isDateFNS, formatISO } from 'date-fns'

const locale = require('date-fns/locale').enUS

export { parseISO }

export const
  now = Date.now,
  isDate = (value: any): value is Date => isDateFNS(value),
  msAgo = (date: number | Date) => differenceInMilliseconds(module.exports.now(), date),
  formatLong =  (date?: number | Date | null) => date ? format(date, 'MM/dd/yy hh:mm:ssaaa', { locale }) : '-',
  formatShort = (date?: number | Date) => date ? format(date, 'MM/dd HH:mm', { locale }) : '',
  formatDateLong =  (date?: number | Date | null) => date ? format(date, 'MM/dd/yy', { locale }) : '-',
  formatDateShort = (date?: number | Date) => date ? format(date, 'MM/dd', { locale }) : '',
  formatTimeLong =  (date?: number | Date | null) => date ? format(date, 'hh:mm:ssaaa', { locale }) : '-',
  formatTimeShort = (date?: number | Date) => date ? format(date, 'HH:mm', { locale }) : '',
  formatDateISO = (date?: number | Date) => date ? formatISO(date, { representation: 'date' }) : ''