const { name, version, author, license, releaseYear, repoLink } = require('./meta')
const { capitalizeHyphenated } = require('../internal/utils/common.utils')
const { jquery, minicss } = require('./urls.cfg')

const title = capitalizeHyphenated(name)

const year = (startYear, endYear) => startYear >= endYear ? endYear : `${startYear} - ${endYear}`

module.exports = {
  title,
  pageOptions: {
    defaultSize: 100,
    sizeList: [5, 10, 25, 50, 100],
  },

  // GUI Buttons
  actions: {
    // Labels
    find: 'Search',
    create: 'Add',
    update: 'Update',
    delete: 'Remove',
    clear: 'Reset'
  },
  // Buttons available in gui User profile editor
  profileActions: [ 'update', 'delete' ],

  // GUI Footer text
  footer: {
    full: [
      `${title} v${version}`,
      `<a href="${license}" target="_blank">Copyright ${year(releaseYear, new Date().getFullYear())}</a> ${author} & contributors`,
    ].concat(repoLink ? `<a href="${repoLink}" target="_blank">Repository</a>` : []),
    short: [
      repoLink ? `<a href="${repoLink}" target="_blank">${title}</a> v${version}` : `${title} v${version}`,
      `<a href="${license}" target="_blank">© ${year(releaseYear, new Date().getFullYear())}</a> ${author}`,
    ]
  },

  // Convert field names to form labels { key: 'Label Text' }
  varNameDict: { id: 'ID', swapId: 'Swap ID' },
  
  // Convert SQLite data types to HTML <input> type [ /SQL-Type Name RegEx/, 'input.type' ]
  sql2html: [
    [/INTEGER|REAL/i, 'number'],
    [/TEXT|BLOB/i, 'text'],
  ],
  boolInputType: 'checkbox',
  
  // Mask values when reporting errors for these values
  mask: [ 'password', 'confirm' ],
  MASK_CHAR: '*',
  
  // Helmet options
  guiCSP: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", jquery.src],
    styleSrc: ["'self'", "'unsafe-inline'", minicss.href],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
  }
}