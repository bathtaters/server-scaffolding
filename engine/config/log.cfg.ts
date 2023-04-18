import type { LogLevels, HttpLog, NoLog } from '../types/log.d'
import { format } from 'winston'
import RegEx, { escapeRegexPattern } from '../libs/regex'
import { noLog } from '../types/log'
import { varName } from '../utils/gui.utils'
import { getMaxEntry } from '../utils/log.utils'
import { testLog } from '../testing/test.cfg'

export const levels: { [level in LogLevels]: number } = {
  error: 0, warn: 1, info: 2, http: 3, verbose: 4
}
export const colors: { [level in LogLevels]: string } = {
  error: 'red', warn: 'yellow', info: 'green', http: 'cyan', verbose: 'gray'
}

const varRegex = RegEx(/%[^%]+%/g)
const additLines = RegEx(/\s*\r?\n.*$/)

export const files = {
  splitHourly: false, // false = Daily
  maxBytes: '25M', // can use k/m/g suffix
  maxDays: 30, 
},

httpDebug: HttpLog[] = ['debug'], // Enable max verbosity for requests/responses

initMessage = (name: string, level?: LogLevels | NoLog) => 
  `${varName(name)} log mode: ${level || 'unknown'}${
    level && level in levels ? ` (${levels[level as keyof typeof levels] + 1} of ${(getMaxEntry(levels).val || -1) + 1})` : ''
  }`,

httpMessage = (mode?: HttpLog) => `HTTP request logging enabled (${mode || 'DEBUG MODE'})`,

// Filter for logView
logViewFileFilter = (filename: string) => RegEx(`^${escapeRegexPattern(filename).replace(varRegex,'.+')}$`),

logFormat = {
  common: format.combine(
    format.errors({ stack: true }),
  ),
  file: format.combine(
    format((info) => process.env.NODE_APP_INSTANCE != null ? { ...info, instance: +process.env.NODE_APP_INSTANCE } : info)(),
    format.uncolorize(),
    format.timestamp(),
    format.json(),
  ),
  console: format.combine(
    format((info) => typeof info.label === 'string' ? { ...info, level: `${info.level} [${info.label}]` } : info)(),
    format.colorize({ colors }),
    format.padLevels(),
    format.printf(({ level, message, stack }) => `${level}: ${stack || message}`),
    // format.json()
  ),
},

// Handle long log lines in Log GUI
maxLogLine = 128,
trimLogMessage = ({ label = '', message = '' }) => label ? '' :
  message.trim().length ?
    `${(message.trim()).slice(0,48).replace(additLines,'')}...` :
    'View Details',

// Ignore logging on these options
silent = Object.values(noLog),

// Get test log level from test.cfg
testLevel = process.env.NODE_ENV === 'test' && testLog