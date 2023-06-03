import RegEx from '../libs/regex'
import { ModelAccess, Role } from '../types/Users'
import { urlCfg } from '../src.import'
import { CorsOrigin } from '../utils/users.cors'
import { generateToken } from '../utils/auth.utils'
import { formEffects } from '../types/gui'

const urls = urlCfg.gui.admin

const passwordLimits = { min: 8, max: 128 }

export const rateLimiter = { maxFails: 5, failWindow: 10 * 60 * 1000, autoUnlock: false } // !autoUnlock: manual unlock by admin

export const definition /*: DefinitionSchema */ = {
  id: {
    type: 'hex?',
    default: generateToken,
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
    default: generateToken,
    limits: { min: 32, max: 32 },
  },
  role: {
    type: Role,
    default: () => new Role('api', 'gui'),
    limits: { elem: { max: 16 }, array: { max: Role.count } },
  },
  cors: {
    type: CorsOrigin,
    default: () => new CorsOrigin(),
    limits: { min: 0, max: 2048 },
  },
  access: {
    type: ModelAccess,
    default: () => new ModelAccess(undefined, ['read', 'write']),
    limits: { elem: { max: 64 }, array: { max: ModelAccess.keys.length * ModelAccess.values.length } },
  },
  failCount: {
    type: 'int?',
    default: 0,
    limits: { min: 0, max: rateLimiter.maxFails + 1 },
    formEffect: formEffects.ignore,
  },
  failTime: {
    type: 'datetime?',
    formEffect: formEffects.ignore,
  },
  guiCount: {
    type: 'int?',
    default: 0,
    limits:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
    formEffect: formEffects.ignore,
  },
  guiTime: {
    type: 'datetime?',
    formEffect: formEffects.ignore,
  },
  apiCount: {
    type: 'int?',
    default: 0,
    limits:  { min: 0, max: Number.MAX_SAFE_INTEGER  },
    formEffect: formEffects.ignore,
  },
  apiTime: {
    type: 'datetime?',
    formEffect: formEffects.ignore,
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
