import type { SettingsDefinitions } from '../types/settings.d'
import { formEffects } from '../types/gui'
import RegEx, { RegExp } from '../libs/regex'

export let definitions: SettingsDefinitions = {
  NODE_ENV: {
    type: 'string',
    default: 'development',
    html: ['development','production','secure-dev'],
    limits: { min: 'test'.length, max: 'development'.length },
    description: 'Server environment',
  },
  port: {
    type: 'int',
    default: 8080,
    html: 'number',
    formEffect: formEffects.readonly,
    limits: { min: 1024, max: 49151 },
    description: 'Server listen port (WARNING: Changing can break the site)',
  },
  LOG_CONSOLE: {
    type: 'string',
    default: 'info',
    html: ['none', 'error', 'warn', 'info', 'http', 'verbose'],
    description: 'Log level for printing to console',
  },
  LOG_FILE: {
    type: 'string',
    default: 'warn',
    html: ['none', 'error', 'warn', 'info', 'http', 'verbose'],
    description: 'Log level for saving to log file',
  },
  LOG_HTTP: {
    type: 'string',
    default: 'common',
    html: ['none', 'tiny', 'short', 'dev', 'common', 'combined', 'debug'],
    description: 'Log format for HTTP logging (Uses Morgan)',
  },
  TRUST_PROXY: {
    type: 'string',
    default: process.env.NODE_ENV === 'production' ? 'true' : '0',
    html: 'text',
    limits: { min: 0, max: 4096 },
    description: 'Trust-Proxy setting. Can be number of hops, true/false for last/first, "loopback" or specifc domains (comma seperated).',
  },
  SESSION_SECRET: {
    type: 'string',
    default: 'secret',
    html: 'password',
    limits: { min: 4, max: 2048 },
    description: 'Secret phrase for user sessions (Changing will logout all users)',
  },
  DB_SECRET: {
    type: 'string',
    default: 'secret',
    html: 'password',
    formEffect: formEffects.readonly,
    limits: { min: 4, max: 2048 },
    description: 'Secret phrase for database (WARNING: Changing requires all dbs/users reset)',
  },
  DB_DIR: {
    type: 'string',
    default: './.db',
    html:  'text',
    formEffect: formEffects.hideDefault,
    limits: { min: 0, max: 2048 },
    description:  'Path to database files (Nothing = [project folder]/.db)',
  },
  LOG_DIR: {
    type: 'string',
    default: './.logs',
    html: 'text',
    formEffect: formEffects.hideDefault,
    limits: { min: 0, max: 2048 },
    description: 'Path to log files (Nothing = [project folder]/.logs)',
  },
}

export const updateRootPath = (staticRootPath: string) => {
  const regex = { path: RegEx(/%PATH%/g), root: RegEx(/^\.\//) }
  definitions.DB_DIR.description  =  definitions.DB_DIR.description &&  definitions.DB_DIR.description.replace(regex.path, definitions.DB_DIR.default  ?? '.')
  definitions.LOG_DIR.description = definitions.LOG_DIR.description && definitions.LOG_DIR.description.replace(regex.path, definitions.LOG_DIR.default ?? '.')
  definitions.DB_DIR.default  = definitions.DB_DIR.default  &&  definitions.DB_DIR.default.replace(regex.root, staticRootPath + '/')
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