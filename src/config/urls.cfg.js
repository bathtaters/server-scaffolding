const RegEx = require(require('../engine.path').libs+'regex')
module.exports = {
  api: {
    prefix: '/api',
    swap:   '/swap',
  },
  gui: {
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
      token: '/regenToken',
    },
    admin: {
      prefix: '/admin',
      home:  '/settings',
      user:  '/users',
      logs:  '/logs',
      form:  '/form',
      find: '/results',
      token: '/regenToken',
    },
  },

  jquery: {
    // src: "/javascripts/jquery-3.6.0.min.js", // Local copy
    src: "https://code.jquery.com/jquery-3.6.0.min.js",
    integrity: "sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4=",
  },
  minicss: {
    // href: "/stylesheets/mini-dark.min.css", // Local copy
    href: "https://cdn.jsdelivr.net/gh/Chalarangelo/mini.css@v3.0.1/dist/mini-dark.min.css",
    // href: "https://cdnjs.cloudflare.com/ajax/libs/mini.css/2.3.7/mini-dark.css", // WRONG STYLES
  },
}