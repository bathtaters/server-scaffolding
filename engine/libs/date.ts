import { parseISO, differenceInMilliseconds, format, isDate, formatISO } from 'date-fns'

// Default Locale
import { enUS as locale } from 'date-fns/locale'

export { parseISO, isDate }

export const now = Date.now
export const
  msAgo = (date: number | Date) => differenceInMilliseconds(now(), date),
  formatLong =  (date?: number | Date | null) => date ? format(date, 'MM/dd/yy hh:mm:ssaaa', { locale }) : '-',
  formatShort = (date?: number | Date) => date ? format(date, 'MM/dd HH:mm', { locale }) : '',
  formatDateLong =  (date?: number | Date | null) => date ? format(date, 'MM/dd/yy', { locale }) : '-',
  formatDateShort = (date?: number | Date) => date ? format(date, 'MM/dd', { locale }) : '',
  formatTimeLong =  (date?: number | Date | null) => date ? format(date, 'hh:mm:ssaaa', { locale }) : '-',
  formatTimeShort = (date?: number | Date) => date ? format(date, 'HH:mm', { locale }) : '',
  formatDateISO = (date?: number | Date) => date ? formatISO(date, { representation: 'date' }) : ''