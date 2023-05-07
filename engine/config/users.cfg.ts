import type { UsersUI, UserDefinition } from '../types/Users.d'
import RegEx from '../libs/regex'
import { ModelAccess, Role } from '../types/Users'
import { urlCfg } from '../src.import'

const urls = urlCfg.gui.admin

const passwordLimits = { min: 8, max: 128 }

export const rateLimiter = { maxFails: 5, failWindow: 10 * 60 * 1000, autoUnlock: false } // !autoUnlock: manual unlock by admin

export const
loginRoles    = new Role('gui', 'admin'),
passwordRoles = new Role('gui', 'admin'),

encode = { iters: 1049, keylen: 64, digest: 'sha512' },

saveLoginMs = 5 * 24 * 60 * 60 * 1000,

apiToken = { header: 'Authorization', matchToken: RegEx(/^Bearer (.+)$/) },

tableFields: Partial<Record<keyof UsersUI, string>> = {
  username: 'Username', role: 'Role', password: 'Password',
  token: 'API Token', cors: 'CORS Origin', access: 'Model Access', 
  guiTime: 'GUI Access', apiTime: 'API Access', failTime: 'Fails',
  locked: 'Locked',
},

tooltips: Partial<Record<keyof UsersUI, string>> = {
  password: `Must be at least ${passwordLimits.min} characters.`,
  confirm: 'Must match Password.',
  cors: 'Enter: * (all), true/false (all/none), comma-seperated urls, or RegExp(&quot;<regexp>&quot;).',
  access: 'Set read/write access based on model. No setting for a model uses default setting.',
  locked: 'Lock/Unlock entire user account'
},

definition: UserDefinition = {
  id: {
    typeStr: 'hex',
    limits: { min: 32, max: 32 },
  },
  username: {
    typeStr: 'string',
    default: 'user',
    limits: { min: 2, max: 255 },
  },
  password: {
    typeStr: 'string?',
    limits: passwordLimits,
  },
  confirm: {
    typeStr: 'string?',
    limits: passwordLimits,
    db: false,
    dbOnly: true,
  },
  token: {
    typeStr: 'hex?',
    limits: { min: 32, max: 32 },
    db: 'TEXT NOT NULL',
  },
  role: {
    typeStr: 'string[]',
    default: new Role('api', 'gui'),
    limits: { elem: { max: 16 }, array: { max: Role.count } },
    isBitmap: true,
    db: 'INTEGER',
  },
  cors: {
    typeStr: 'string*',
    default: '*',
    limits: { min: 0, max: 2048 },
  },
  access: {
    typeStr: 'string[]',
    default: new ModelAccess(undefined, ['read', 'write']),
    limits: { elem: { max: 64 }, array: { max: ModelAccess.keys.length * ModelAccess.values.length } },
    db: 'TEXT',
  },
  failCount: {
    typeStr: 'int?',
    default: 0,
    limits: { min: 0, max: rateLimiter.maxFails + 1 },
    html: false,
  },
  failTime: {
    typeStr: 'datetime?',
    html: false,
  },
  guiCount: {
    typeStr: 'int?',
    default: 0,
    limits:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
    html: false,
  },
  guiTime: {
    typeStr: 'datetime?',
    html: false,
  },
  apiCount: {
    typeStr: 'int?',
    default: 0,
    limits:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
    html: false,
  },
  apiTime: {
    typeStr: 'datetime?',
    html: false,
  },
  locked: {
    typeStr: 'boolean',
    default: false,
  },
  salt:  { typeStr: 'hex?', html: false, dbOnly: true },
} as const,

searchableKeys: Array<keyof UsersUI> = ['username','token','role','cors','locked'], // 'access'
illegalUsername = RegEx(/[^a-zA-Z0-9_-]/),

// Paths that expect JSON responses (not HTML)
jsonPaths = [ `${urls.prefix}${urls.user}${urls.token}` ],

// Buttons available in gui User profile editor
profileActions = [ 'update', 'delete' ] as const
