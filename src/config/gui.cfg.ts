import { name, version, author, license, releaseYear, repoLink } from '../../engine/config/meta'
import { isSecure } from '../../engine/config/server.cfg'
import { capitalizeHyphenated } from '../../engine/utils/common.utils'
import { jquery, minicss, gui as guiUrl } from './urls.cfg'

const year = (startYear: number, endYear?: number) => !endYear || startYear >= endYear ? endYear : `${startYear} - ${endYear}`

export const title = capitalizeHyphenated(name)
export const pageOptions = {
  defaultSize: 100,
  sizeList: [5, 10, 25, 50, 100],
},

// GUI Footer text
footer = {
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
varNameDict: Record<string,string> = { id: 'ID', swapId: 'Swap ID' },

// Mask values when reporting errors for these values
mask = [ 'password', 'confirm' ],
MASK_CHAR = '*',

// Paths that expect JSON responses (not HTML)
jsonPaths = [
  guiUrl.basic.prefix + guiUrl.basic.home + '/:model' + guiUrl.basic.swap,
  guiUrl.basic.prefix + guiUrl.basic.user + guiUrl.basic.token,
],

// Helmet options
guiCSP = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", jquery.src],
  styleSrc: ["'self'", "'unsafe-inline'", minicss.href],
  upgradeInsecureRequests: isSecure ? [] : null,
}