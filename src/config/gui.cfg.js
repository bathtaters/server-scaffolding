const { name, version, author, license, releaseYear, repoLink } = require('./meta')

const capitalizeHyphenated = (str) => str.replace(/^\w/, a=>a.toUpperCase()).replace(/-(\w)/g, (_,g)=>' '+g.toUpperCase())

const title = capitalizeHyphenated(name)
const year = (startYear, endYear) => startYear >= endYear ? endYear : `${startYear} - ${endYear}`

module.exports = {

  // GUI Footer text
  title,
  footer: {
    full: [
      `${title} v${version}`,
      `<a href="${license}" target="_blank">Copyright ${year(releaseYear, new Date().getFullYear())}</a> ${author} & contributors`,
    ].concat(repoLink ? `<a href="${repoLink}" target="_blank">Repository</a>` : []),
    short: [
      `${title} v${version}`,
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
  
  // Mask values when reporting errors for these values
  mask: [ 'password', 'confirm' ],
  MASK_CHAR: '*',
  
}