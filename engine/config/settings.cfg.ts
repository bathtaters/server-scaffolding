import type { SettingsDefinitions } from '../types/settings.d'
import RegEx, { RegExp } from '../libs/regex'

export let definitions: SettingsDefinitions = {
  NODE_ENV: {
    default: 'development',
    html: { type: ['development','production','secure-dev'], limits: { min: 'test'.length, max: 'development'.length } },
    tooltip: 'Server environment',
  },
  port: {
    default: '8080',
    html: { type: 'number', readonly: true, limits: { min: 1024, max: 49151 } },
    tooltip: 'Server listen port (WARNING: Changing can break the site)',
  },
  LOG_CONSOLE: {
    default: 'info',
    html: { type: ['none', 'error', 'warn', 'info', 'http', 'verbose'] },
    tooltip: 'Log level for printing to console',
  },
  LOG_FILE: {
    default: 'warn',
    html: { type: ['none', 'error', 'warn', 'info', 'http', 'verbose'] },
    tooltip: 'Log level for saving to log file',
  },
  LOG_HTTP: {
    default: 'common',
    html: { type: ['none', 'tiny', 'short', 'dev', 'common', 'combined', 'debug'] },
    tooltip: 'Log format for HTTP logging (Uses Morgan)',
  },
  TRUST_PROXY: {
    default: process.env.NODE_ENV === 'production' ? 'true' : '0',
    html: { type: 'text', limits: { min: 0, max: 4096 } },
    tooltip: 'Trust-Proxy setting. Can be number of hops, true/false for last/first, "loopback" or specifc domains (comma seperated).',
  },
  SESSION_SECRET: {
    default: 'secret',
    html: { type: 'password', limits: { min: 4, max: 2048 } },
    tooltip: 'Secret phrase for user sessions (Changing will logout all users)',
  },
  DB_SECRET: {
    default: 'secret',
    html: { type: 'password', readonly: true, limits: { min: 4, max: 2048 } },
    tooltip: 'Secret phrase for database (WARNING: Changing requires all dbs/users reset)',
  },
  DB_DIR: {
    default: './.db',
    html:  { type: 'text', limits: { min: 0, max: 2048 } },
    tooltip:  'Path to database files (Nothing = [project folder]/.db)',
    formDefault: '',
  },
  LOG_DIR: {
    default: './.logs',
    html: { type: 'text', limits: { min: 0, max: 2048 } },
    tooltip: 'Path to log files (Nothing = [project folder]/.logs)',
    formDefault: '',
  },
}

export const updateRootPath = (staticRootPath: string) => {
  const regex = { path: RegEx(/%PATH%/g), root: RegEx(/^\.\//) }
  definitions.DB_DIR.tooltip  = definitions.DB_DIR.tooltip  && definitions.DB_DIR.tooltip.replace( regex.path, definitions.DB_DIR.default  ?? '.')
  definitions.LOG_DIR.tooltip = definitions.LOG_DIR.tooltip && definitions.LOG_DIR.tooltip.replace(regex.path, definitions.LOG_DIR.default ?? '.')
  definitions.DB_DIR.default  = definitions.DB_DIR.default  && definitions.DB_DIR.default.replace( regex.root, staticRootPath + '/')
  definitions.LOG_DIR.default = definitions.LOG_DIR.default && definitions.LOG_DIR.default.replace(regex.root, staticRootPath + '/')
}

export const
restartTimeout = 12,
fileReadDebounceMs = 3000, // 0 = no debouncing, -1 = only read file after update

escapeChars: { find: RegExp, repl: string }[] = [
  { find: RegEx(/\n/g), repl: ' '   },
  { find: RegEx(/=/g),  repl: '%3D' },
],

escapeEnvMsg = (char: string, idx: number, val: string) => `Stripping illegal character '${char}' from "${val}" [${idx}]`