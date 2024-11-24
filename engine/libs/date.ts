import { parseISO, differenceInMilliseconds, format, isDate, formatISO } from 'date-fns'
import * as locales from 'date-fns/locale'

let locale = locales.enUS
const fmtStr = {
  formatLong: 'MM/dd/yy hh:mm:ssaaa',
  formatShort: 'MM/dd HH:mm',
  formatDateLong: 'MM/dd/yy',
  formatDateShort: 'MM/dd',
  formatTimeLong: 'hh:mm:ssaaa',
  formatTimeShort: 'HH:mm',
  /** Value to return on format...Long function when no Date object is provided. */
  noneLong: '-',
  /** Value to return on format...Short function when no Date object is provided. */
  noneShort: '',
}

/** Set Time/Date formatting options. ('none...' options are value when no Date object is present) */
export const config = (options: Partial<DateOptions> = {}) => {
  // Set locale
  if (options.locale) {
    if (!(options.locale in locales))
      throw new Error(`Invalid locale code: '${options.locale}'`)
    locale = locales[options.locale]
  }
  // Set remaining values
  for (const key in options) {
    if (key === 'locale') continue
    (fmtStr as any)[key] = (options as any)[key]
  }
}

export { parseISO, isDate }
export const now = Date.now
export const
  msAgo = (date: number | Date) => differenceInMilliseconds(now(), date),
  formatLong =  (date?: number | Date | null) => date ? format(date, fmtStr.formatLong, { locale }) : fmtStr.noneLong,
  formatShort = (date?: number | Date) => date ? format(date, fmtStr.formatShort, { locale }) : fmtStr.noneShort,
  formatDateLong =  (date?: number | Date | null) => date ? format(date, fmtStr.formatDateLong, { locale }) : fmtStr.noneLong,
  formatDateShort = (date?: number | Date) => date ? format(date, fmtStr.formatDateShort, { locale }) : fmtStr.noneShort,
  formatTimeLong =  (date?: number | Date | null) => date ? format(date, fmtStr.formatTimeLong, { locale }) : fmtStr.noneLong,
  formatTimeShort = (date?: number | Date) => date ? format(date, fmtStr.formatTimeShort, { locale }) : fmtStr.noneShort,
  formatDateISO = (date?: number | Date) => date ? formatISO(date, { representation: 'date' }) : fmtStr.noneShort


/** Date options including locale & string formats (https://date-fns.org/docs/format). */
export type DateOptions = { locale: keyof typeof locales } & typeof fmtStr