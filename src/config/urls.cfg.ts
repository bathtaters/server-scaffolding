import RegEx from '../../engine/libs/regex'

export const api = {
  prefix: '/api',
  swap:   '/swap',
} as const,

gui = {
  splashRedirect: RegEx(/\/index(?:\.html?)?|\/home(?:\.html?)?/),
  root: {
    login:  '/login',
    logout: '/logout',
  },
  basic: {
    prefix: '/gui',
    home: '/db',
    user: '/profile',
    swap: '/swap',
    form: '/form',
    find: '/results',
    token: '/tokenRegen',
  },
  admin: {
    prefix: '/admin',
    home:  '/settings',
    user:  '/users',
    logs:  '/logs',
    form:  '/form',
    find: '/results',
    token: '/tokenRegen',
  },
} as const

export const landingPage = {
  gui:   gui.basic.prefix + gui.basic.home,
  admin: gui.admin.prefix + gui.admin.home,
  login: gui.basic.prefix + gui.basic.home,
  logout: gui.root.login,
} as const

// null will use index.pug as splash page, URL string will 301 redirect
export const overrideSplash: string | null = null

export const jquery = {
  // src: "/javascripts/jquery-3.6.0.min.js", // Local copy
  src: "https://code.jquery.com/jquery-3.6.0.min.js",
  integrity: "sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=",
} as const,

minicss = {
  // href: "/stylesheets/mini-dark.min.css", // Local copy
  href: "https://cdn.jsdelivr.net/gh/Chalarangelo/mini.css@v3.0.1/dist/mini-dark.min.css",
  // href: "https://cdnjs.cloudflare.com/ajax/libs/mini.css/2.3.7/mini-dark.css", // WRONG STYLES
} as const