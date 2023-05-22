import RegEx from '../libs/regex'
import { ModelAccess, Role } from '../types/Users'
import { urlCfg } from '../src.import'

const urls = urlCfg.gui.admin

const passwordLimits = { min: 8, max: 128 }

export const rateLimiter = { maxFails: 5, failWindow: 10 * 60 * 1000, autoUnlock: false } // !autoUnlock: manual unlock by admin

export const definition /*: DefinitionSchema */ = {
  id: {
    type: 'hex',
    limits: { min: 32, max: 32 },
  },
  username: {
    type: 'string',
    limits: { min: 2, max: 255 },
  },
  password: {
    type: 'string?',
    limits: passwordLimits,
    isMasked: true,
  },
  confirm: {
    type: 'string?',
    limits: passwordLimits,
    db: false,
    isMasked: true,
  },
  token: {
    type: 'hex?',
    limits: { min: 32, max: 32 },
    db: 'TEXT NOT NULL',
  },
  role: {
    type: 'string[]',
    default: new Role('api', 'gui'),
    limits: { elem: { max: 16 }, array: { max: Role.count } },
    isBitmap: true,
    db: 'INTEGER',
  },
  cors: {
    type: 'string*',
    default: '*',
    limits: { min: 0, max: 2048 },
  },
  access: {
    type: 'string[]',
    default: new ModelAccess(undefined, ['read', 'write']).toArray(),
    limits: { elem: { max: 64 }, array: { max: ModelAccess.keys.length * ModelAccess.values.length } },
    db: 'TEXT',
  },
  failCount: {
    type: 'int?',
    default: 0,
    limits: { min: 0, max: rateLimiter.maxFails + 1 },
    skipForm: true,
  },
  failTime: {
    type: 'datetime?',
    skipForm: true,
  },
  guiCount: {
    type: 'int?',
    default: 0,
    limits:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
    skipForm: true,
  },
  guiTime: {
    type: 'datetime?',
    skipForm: true,
  },
  apiCount: {
    type: 'int?',
    default: 0,
    limits:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
    skipForm: true,
  },
  apiTime: {
    type: 'datetime?',
    skipForm: true,
  },
  locked: {
    type: 'boolean',
    default: false,
  },
  salt:  { type: 'hex?', html: false, isMasked: true },
} as const

export const
loginRoles    = new Role('gui', 'admin'),
passwordRoles = new Role('gui', 'admin'),

encode = { iters: 1049, keylen: 64, digest: 'sha512' },

saveLoginMs = 5 * 24 * 60 * 60 * 1000,

apiToken = { header: 'Authorization', matchToken: RegEx(/^Bearer (.+)$/) },

tableFields: Partial<Record<keyof typeof definition, string>> = {
  username: 'Username', role: 'Role', password: 'Password',
  token: 'API Token', cors: 'CORS Origin', access: 'Model Access', 
  guiTime: 'GUI Access', apiTime: 'API Access', failTime: 'Fails',
  locked: 'Locked',
},

tooltips: Partial<Record<keyof typeof definition, string>> = {
  password: `Must be at least ${passwordLimits.min} characters.`,
  confirm: 'Must match Password.',
  cors: 'Enter: * (all), true/false (all/none), comma-seperated urls, or RegExp(&quot;<regexp>&quot;).',
  access: 'Set read/write access based on model. No setting for a model uses default setting.',
  locked: 'Lock/Unlock entire user account'
},

searchableKeys: Array<keyof typeof definition> = ['username','token','role','cors','locked'], // 'access'
illegalUsername = RegEx(/[^a-zA-Z0-9_-]/),

// Paths that expect JSON responses (not HTML)
jsonPaths = [ `${urls.prefix}${urls.user}${urls.token}` ],

// Buttons available in gui User profile editor
profileActions = [ 'update', 'delete' ] as const
